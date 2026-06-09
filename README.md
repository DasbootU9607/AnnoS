# AnnoS

This folder contains a standalone browser-based MVP for the manual gait ground-truth annotation PRD.

## Run

Open `index.html` in a modern browser. No build step or server is required.

## Main Capabilities

- Import local walking videos.
- Inspect playback, seek timeline, and move frame by frame.
- Two-point distance calibration with walking-axis coordinate conversion.
- Add left and right foot contact points.
- Drag, delete, undo, redo, and relabel points.
- Store pixel coordinates, frame index, timestamp, real X/Y coordinates, confidence, landmark, and notes.
- Calculate step length, stride length, step width, step time, and gait speed.
- Run basic quality checks.
- Export `video_metadata.csv`, `manual_footstep_annotations.csv`, and `manual_gait_truth_summary.csv`.
- Save and reload annotation project JSON.

## Notes

Browsers do not expose reliable FPS metadata for arbitrary local video files. The app provides an editable FPS field, defaulting to 30 fps, and uses it for frame indexing and frame stepping.

Two-point calibration defines the X axis from calibration point 1 to point 2. The Y axis is perpendicular to that direction.
