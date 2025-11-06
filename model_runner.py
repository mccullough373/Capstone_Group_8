import math
import time
from dataclasses import dataclass

# Choose backend: "stub", "tflite", or "keras"
MODEL_BACKEND = "stub"
MODEL_PATH = "path/to/your_model.tflite"  # or .h5 / SavedModel dir for Keras
CLASS_NAME = "PG"

@dataclass
class Prediction:
    class_name: str
    probability: float  # 0..1

class ModelRunner:
    def __init__(self, update_interval_ms: int = 1250):
        self.update_interval_ms = update_interval_ms
        self._last = 0.0
        self._load()

    def _load(self):
        if MODEL_BACKEND == "stub":
            self.backend = "stub"
            return

        if MODEL_BACKEND == "tflite":
            try:
                import numpy as np
                import tflite_runtime.interpreter as tflite  # minimal runtime
            except Exception:
                # Fallback to full TF if available
                import numpy as np  # noqa: F401
                import tensorflow as tf  # type: ignore
                tflite = None  # type: ignore

            self.backend = "tflite"
            self._tflite = tflite
            if tflite is not None:
                self._interpreter = tflite.Interpreter(model_path=MODEL_PATH)
            else:
                # Use TF lite Interpreter from tensorflow if available
                self._interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)  # type: ignore
            self._interpreter.allocate_tensors()
            self._input_details = self._interpreter.get_input_details()
            self._output_details = self._interpreter.get_output_details()
            return

        if MODEL_BACKEND == "keras":
            import numpy as np  # noqa: F401
            import tensorflow as tf  # type: ignore
            self.backend = "keras"
            self._model = tf.keras.models.load_model(MODEL_PATH)
            return

        raise ValueError("Unsupported MODEL_BACKEND")

    def _preprocess(self, frame):
        # frame is a QImage; for real models convert to numpy (RGB), resize, normalize
        return frame

    def predict(self, frame) -> Prediction:
        # Stub prediction: smooth pseudo-probability between 0.05 and 0.95
        if getattr(self, "backend", "stub") == "stub":
            p = 0.5 + 0.45 * math.sin(time.time() * 2 * math.pi / 5.0)
            return Prediction(class_name=CLASS_NAME, probability=float(max(0.0, min(1.0, p))))

        if self.backend == "tflite":
            # TODO: implement preprocessing, interpreter invocation, and probability extraction
            return Prediction(class_name=CLASS_NAME, probability=0.0)

        if self.backend == "keras":
            # TODO: implement preprocessing, model.predict, and probability extraction
            return Prediction(class_name=CLASS_NAME, probability=0.0)

        return Prediction(class_name=CLASS_NAME, probability=0.0)
