# app/services/proctor_service.py
# Minimal proctoring helpers - only returns event flags, no raw video storage.
def analyze_frame_meta(frame_meta: dict):
    """
    frame_meta is a small dict from frontend indicating face_count, gaze_score, etc.
    Example: {"face_count":1, "face_present": True, "gaze_score": 0.9}
    """
    events = []
    if frame_meta.get("face_count",0) > 1:
        events.append("multiple_faces")
    if not frame_meta.get("face_present", True):
        events.append("face_lost")
    if frame_meta.get("gaze_score", 1.0) < 0.2:
        events.append("looking_away")
    return events
