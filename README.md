# AnnoS

AnnoS is a local, browser-based annotation system for creating manual ground truth from walking videos. It helps reviewers mark foot contact points, calibrate real-world distance, calculate gait metrics, and export structured datasets for downstream analysis.

The application runs entirely in the browser. Video files and annotation data stay on the user's machine unless the user exports or shares them.

## Features

- Load local walking videos without upload or server setup.
- Review video with timeline seeking, playback speed control, and frame-step navigation.
- Calibrate pixel distance to real-world centimeters using a two-point reference.
- Set a separate walking-direction axis for projected step length and stride length.
- Annotate left and right foot contact points on the video frame.
- Edit annotations by selecting, dragging, deleting, undoing, redoing, and updating point metadata.
- Calculate step length, stride length, step width, step time, and gait speed.
- Run built-in quality checks for calibration, point count, confidence, and metric ranges.
- Save and reload annotation sessions as JSON.
- Export analysis-ready CSV files.

## Quick Start

Open `index.html` in a modern desktop browser.

No installation, build step, or backend service is required.

## Basic Workflow

1. Load a local walking video.
2. Fill in video metadata such as video ID, subject ID, reviewer, camera angle, and FPS.
3. Use **Calibrate** mode to select two reference points and enter their known distance.
4. Use **Direction** mode to click two points along the subject's walking direction.
5. Use **Left** and **Right** modes to mark foot contact points.
6. Review computed metrics and quality checks.
7. Save the project as JSON or export CSV files.

## Exported Files

AnnoS exports three CSV files:

- `video_metadata.csv`: video-level metadata, calibration information, and review notes.
- `manual_footstep_annotations.csv`: point-level annotation data including frame index, timestamp, pixel coordinates, calibrated coordinates, side, confidence, landmark, and derived gait metrics.
- `manual_gait_truth_summary.csv`: video-level gait summary metrics.

Project JSON files preserve the current annotation session and can be loaded back into AnnoS later.

## Technical Notes

- FPS is editable because browsers do not expose reliable FPS metadata for all local video files.
- Frame index and frame-step controls use the configured FPS value.
- Calibration only defines scale in cm/px.
- Direction defines the X axis used for forward projection. Step length and stride length are measured along this axis, and step width is measured on the perpendicular axis.
- If direction is not set, older projects fall back to using calibration point 1 to calibration point 2 as the X axis.
- The system is implemented as static HTML, CSS, and JavaScript.

## License

AnnoS is released under the MIT License. See `LICENSE` for details.
