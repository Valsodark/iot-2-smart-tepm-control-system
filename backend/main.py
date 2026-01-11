# main.py
from fastapi import FastAPI, WebSocket
from starlette.websockets import WebSocketDisconnect

import board
import adafruit_dht
import asyncio
import time
import traceback
from threading import Thread, Lock

import signal
import sys

from gpiozero import Servo
from gpiozero.pins.pigpio import PiGPIOFactory

app = FastAPI()

# -------- AM3202 / DHT22 on GPIO17 --------
dht_sensor = adafruit_dht.DHT22(board.D17, use_pulseio=False)

# -------- MG90S continuous rotation servo on GPIO18 --------
factory = PiGPIOFactory()
fan_servo = Servo(
    18,
    pin_factory=factory,
    min_pulse_width=1.0 / 1000,
    max_pulse_width=2.0 / 1000
)

# -------- Shared state --------
MAX_RPM = 120

target_speed = 0.0          # 0..1 control for fan thread
cold_air_out = False
hot_air_out = False

running = True              # stops fan thread on server shutdown

active_clients = 0          # number of connected frontends
lock = Lock()


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def speed01_to_servo_value(speed01: float) -> float:
    """
    Continuous rotation servo:
      0.0 -> stop, 1.0 -> full speed forward
    If your servo spins backward, change to: return -clamp(speed01,0,1)
    """
    return clamp(speed01, 0.0, 1.0)


def stop_motor_now(reason: str):
    """Stop motor + clear mode flags."""
    global target_speed, cold_air_out, hot_air_out
    target_speed = 0.0
    cold_air_out = False
    hot_air_out = False
    print(f"STOP MOTOR ({reason})", flush=True)


def temp_to_speed_and_mode(temp_c: float):
    """
    Heating+cooling logic with hysteresis.
    Returns: (speed_0_1, cold_flag, hot_flag)
    """
    HEAT_ON = 20.0
    HEAT_OFF = 21.0
    COOL_ON = 25.0
    COOL_OFF = 24.0

    IDLE_SPEED = 0.25
    FULL_HEAT_AT = 16.0
    FULL_COOL_AT = 32.0

    global cold_air_out, hot_air_out

    # Hysteresis
    if cold_air_out and temp_c <= COOL_OFF:
        cold_air_out = False
    if hot_air_out and temp_c >= HEAT_OFF:
        hot_air_out = False

    if not cold_air_out and not hot_air_out:
        if temp_c >= COOL_ON:
            cold_air_out = True
        elif temp_c <= HEAT_ON:
            hot_air_out = True

    # Speed curves
    if cold_air_out:
        s = (temp_c - COOL_ON) / (FULL_COOL_AT - COOL_ON)
        s = clamp(s, 0.0, 1.0)
        s *= s
        speed = IDLE_SPEED + (1.0 - IDLE_SPEED) * s
        return speed, True, False

    if hot_air_out:
        s = (HEAT_ON - temp_c) / (HEAT_ON - FULL_HEAT_AT)
        s = clamp(s, 0.0, 1.0)
        s *= s
        speed = IDLE_SPEED + (1.0 - IDLE_SPEED) * s
        return speed, False, True

    return IDLE_SPEED, False, False


def hard_stop_servo():
    """Stop PWM and release GPIO."""
    try:
        fan_servo.value = 0.0
    except Exception:
        pass
    try:
        fan_servo.close()
    except Exception:
        pass


def fan_loop():
    """Continuously apply target_speed to the servo."""
    global running, target_speed
    while running:
        try:
            fan_servo.value = speed01_to_servo_value(target_speed)
        except Exception:
            traceback.print_exc()
        time.sleep(0.1)

    hard_stop_servo()
    print("FAN THREAD EXIT → SERVO STOPPED", flush=True)


Thread(target=fan_loop, daemon=True).start()


@app.on_event("shutdown")
def shutdown_event():
    global running
    print("SERVER SHUTDOWN → STOPPING MOTOR", flush=True)
    running = False


def handle_exit(sig, frame):
    global running
    print(f"SIGNAL {sig} → STOPPING MOTOR", flush=True)
    running = False
    hard_stop_servo()
    sys.exit(0)


signal.signal(signal.SIGINT, handle_exit)
signal.signal(signal.SIGTERM, handle_exit)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global active_clients, target_speed

    await websocket.accept()

    with lock:
        active_clients += 1
        print("WS CONNECTED:", websocket.client, "| active_clients =", active_clients, flush=True)

    try:
        while True:
            # If no clients (shouldn't happen inside a live connection, but safe):
            with lock:
                if active_clients <= 0:
                    stop_motor_now("active_clients <= 0 (safety)")
                    await asyncio.sleep(0.5)
                    continue

            # ---- Read DHT until it succeeds (send only on valid reads) ----
            try:
                temp = dht_sensor.temperature
                hum = dht_sensor.humidity
            except RuntimeError:
                await asyncio.sleep(0.5)
                continue

            if temp is None or hum is None:
                await asyncio.sleep(0.5)
                continue

            # ---- Compute speed + mode ----
            speed, cold_flag, hot_flag = temp_to_speed_and_mode(temp)

            # IMPORTANT: still only run the motor if someone is connected
            with lock:
                if active_clients == 0:
                    stop_motor_now("no clients during update")
                    await asyncio.sleep(0.5)
                    continue

            target_speed = speed
            rpm = int(clamp(speed, 0.0, 1.0) * MAX_RPM)

            payload = {
                "temp": round(temp, 1),
                "humidity": round(hum, 1),
                "rpm": rpm,
                "cold_air_out": cold_flag,
                "hot_air_out": hot_flag
            }

            print("SEND PAYLOAD:", payload, flush=True)
            await websocket.send_json(payload)

            # DHT shouldn't be read too fast
            await asyncio.sleep(2)

    except WebSocketDisconnect:
        print("WebSocket client disconnected.", flush=True)

    except Exception:
        print("FATAL ERROR:", flush=True)
        traceback.print_exc()

    finally:
        # Decrement client count and STOP motor if last client left
        with lock:
            active_clients = max(0, active_clients - 1)
            print("WS LEFT | active_clients =", active_clients, flush=True)

            if active_clients == 0:
                stop_motor_now("last client disconnected")
