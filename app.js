const $ = (id) => document.getElementById(id);

const els = {
  videoInput: $("videoInput"),
  projectInput: $("projectInput"),
  loadProjectBtn: $("loadProjectBtn"),
  saveProjectBtn: $("saveProjectBtn"),
  clearAllBtn: $("clearAllBtn"),
  exportAllBtn: $("exportAllBtn"),
  leftSidebarToggle: $("leftSidebarToggle"),
  rightSidebarToggle: $("rightSidebarToggle"),
  video: $("video"),
  canvas: $("overlayCanvas"),
  mediaLayer: $("mediaLayer"),
  videoViewport: $("videoViewport"),
  emptyState: $("emptyState"),
  tooltip: $("tooltip"),
  currentVideoLabel: $("currentVideoLabel"),
  saveStatus: $("saveStatus"),
  fileName: $("fileName"),
  durationInfo: $("durationInfo"),
  resolutionInfo: $("resolutionInfo"),
  frameCountInfo: $("frameCountInfo"),
  videoId: $("videoId"),
  subjectId: $("subjectId"),
  videoDate: $("videoDate"),
  reviewer: $("reviewer"),
  cameraAngle: $("cameraAngle"),
  cameraStatus: $("cameraStatus"),
  fpsInput: $("fpsInput"),
  usabilityGrade: $("usabilityGrade"),
  videoNote: $("videoNote"),
  knownDistance: $("knownDistance"),
  carpetLength: $("carpetLength"),
  carpetWidth: $("carpetWidth"),
  scaleNote: $("scaleNote"),
  calibrationStatus: $("calibrationStatus"),
  groundStatus: $("groundStatus"),
  directionStatus: $("directionStatus"),
  landmarkType: $("landmarkType"),
  confidence: $("confidence"),
  segmentSelect: $("segmentSelect"),
  segmentTypeSelect: $("segmentTypeSelect"),
  newSegmentBtn: $("newSegmentBtn"),
  selectedEmpty: $("selectedEmpty"),
  selectedForm: $("selectedForm"),
  selectedSegment: $("selectedSegment"),
  selectedStepIndex: $("selectedStepIndex"),
  selectedOrderMode: $("selectedOrderMode"),
  applyStepOrderBtn: $("applyStepOrderBtn"),
  moveStepUpBtn: $("moveStepUpBtn"),
  moveStepDownBtn: $("moveStepDownBtn"),
  selectedFoot: $("selectedFoot"),
  selectedLandmark: $("selectedLandmark"),
  selectedConfidence: $("selectedConfidence"),
  selectedNote: $("selectedNote"),
  pointsTable: $("pointsTable"),
  pointCount: $("pointCount"),
  resultsGrid: $("resultsGrid"),
  qualityList: $("qualityList"),
  playPauseBtn: $("playPauseBtn"),
  prevFrameBtn: $("prevFrameBtn"),
  nextFrameBtn: $("nextFrameBtn"),
  jumpBackBtn: $("jumpBackBtn"),
  jumpForwardBtn: $("jumpForwardBtn"),
  timeline: $("timeline"),
  speedSelect: $("speedSelect"),
  timeReadout: $("timeReadout"),
  frameReadout: $("frameReadout"),
  autoSwitch: $("autoSwitch"),
  undoBtn: $("undoBtn"),
  redoBtn: $("redoBtn"),
  insertBeforeBtn: $("insertBeforeBtn"),
  insertAfterBtn: $("insertAfterBtn"),
  deletePointBtn: $("deletePointBtn"),
  resetViewBtn: $("resetViewBtn")
};

const state = {
  mode: "select",
  dirty: false,
  videoObjectUrl: null,
  videoMeta: {
    fileName: "",
    duration: 0,
    width: 0,
    height: 0,
    fps: 30,
    totalFrames: 0
  },
  calibration: {
    points: [],
    groundPlanePoints: [],
    directionPoints: [],
    knownDistanceCm: 100,
    cmPerPixel: null,
    note: ""
  },
  points: [],
  segments: [
    { id: "segment_1", label: "Segment 1", directionPoints: [] }
  ],
  activeSegmentId: "segment_1",
  orderingMode: "time",
  selectedPointId: null,
  draggingPointId: null,
  hoverPointId: null,
  panning: false,
  panStart: null,
  view: { scale: 1, x: 0, y: 0 },
  history: [],
  redo: []
};

const SEGMENT_TYPES = [
  { value: "straight", label: "straight", straight: true, full: true },
  { value: "turn", label: "turn", straight: false, full: true },
  { value: "pacing", label: "pacing", straight: false, full: true },
  { value: "start_stop", label: "start/stop", straight: false, full: true },
  { value: "posepro_include", label: "PosePro include", straight: false, full: true },
  { value: "exclude", label: "exclude", straight: false, full: false }
];

function metadata() {
  return {
    video_id: els.videoId.value.trim(),
    subject_id: els.subjectId.value.trim(),
    video_date: els.videoDate.value,
    camera_angle: els.cameraAngle.value,
    camera_status: els.cameraStatus.value,
    fps: fps(),
    usability_grade: els.usabilityGrade.value,
    reviewer: els.reviewer.value.trim(),
    note: els.videoNote.value.trim(),
    carpet_length_cm: numberOrBlank(els.carpetLength.value),
    carpet_width_cm: numberOrBlank(els.carpetWidth.value),
    scale_note: els.scaleNote.value.trim()
  };
}

function calibrationMethod() {
  return groundPlaneHomography()
    ? "four-point ground-plane homography"
    : state.segments.some((segment) => segment.directionPoints.length === 2) || state.calibration.directionPoints.length === 2
    ? "two-point distance calibration + segment walking-direction projection"
    : "two-point distance calibration; calibration line used as walking direction";
}

function normalizeSegments(segments = [], points = state.points) {
  const source = Array.isArray(segments) && segments.length
    ? segments
    : [{ id: "segment_1", label: "Segment 1", type: "straight", directionPoints: state.calibration.directionPoints || [] }];
  const normalized = source.map((segment, index) => ({
    id: segment.id || `segment_${index + 1}`,
    label: segment.label || segment.name || `Segment ${index + 1}`,
    type: normalizeSegmentType(segment.type),
    directionPoints: Array.isArray(segment.directionPoints) ? segment.directionPoints : []
  }));
  const validIds = new Set(normalized.map((segment) => segment.id));
  points.forEach((point) => {
    if (!validIds.has(point.segment_id)) point.segment_id = normalized[0].id;
  });
  return normalized;
}

function normalizeSegmentType(type) {
  return SEGMENT_TYPES.some((item) => item.value === type) ? type : "straight";
}

function segmentTypeMeta(type) {
  return SEGMENT_TYPES.find((item) => item.value === type) || SEGMENT_TYPES[0];
}

function segmentById(id) {
  return state.segments.find((segment) => segment.id === id) || state.segments[0];
}

function activeSegment() {
  return segmentById(state.activeSegmentId);
}

function segmentIndex(id) {
  const index = state.segments.findIndex((segment) => segment.id === id);
  return index >= 0 ? index + 1 : 1;
}

function segmentLabel(id) {
  const segment = segmentById(id);
  return segment?.label || `Segment ${segmentIndex(id)}`;
}

function segmentTypeLabel(type) {
  return segmentTypeMeta(type).label;
}

function pointsInSegment(segmentId) {
  return state.points.filter((point) => point.segment_id === segmentId);
}

function nextSegmentId() {
  let n = state.segments.length + 1;
  while (state.segments.some((segment) => segment.id === `segment_${n}`)) n += 1;
  return `segment_${n}`;
}

function createSegment() {
  pushHistory();
  const id = nextSegmentId();
  state.segments.push({
    id,
    label: `Segment ${state.segments.length + 1}`,
    type: "straight",
    directionPoints: []
  });
  state.activeSegmentId = id;
  renderAll();
  setDirty();
}

function numberOrBlank(value) {
  const n = Number(value);
  return Number.isFinite(n) && value !== "" ? n : "";
}

function fps() {
  const value = Number(els.fpsInput.value);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

function currentFrame() {
  return Math.round(els.video.currentTime * fps());
}

function setDirty(value = true) {
  state.dirty = value;
  els.saveStatus.textContent = value ? "Unsaved local session" : "Saved or exported";
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  draw();
}

function snapshot() {
  return JSON.stringify({
    calibration: state.calibration,
    points: state.points,
    segments: state.segments,
    activeSegmentId: state.activeSegmentId,
    orderingMode: state.orderingMode,
    selectedPointId: state.selectedPointId
  });
}

function restoreSnapshot(raw) {
  const data = JSON.parse(raw);
  state.calibration = normalizeCalibration(data.calibration);
  state.points = data.points;
  state.segments = normalizeSegments(data.segments, state.points);
  state.activeSegmentId = data.activeSegmentId || state.segments[0].id;
  state.orderingMode = data.orderingMode || "time";
  state.selectedPointId = data.selectedPointId;
  recalcRealCoordinates();
  renderAll();
}

function pushHistory() {
  state.history.push(snapshot());
  if (state.history.length > 120) state.history.shift();
  state.redo = [];
  updateUndoRedo();
}

function updateUndoRedo() {
  els.undoBtn.disabled = state.history.length === 0;
  els.redoBtn.disabled = state.redo.length === 0;
}

function updatePointActionButtons() {
  const point = selectedPoint();
  const hasPoint = Boolean(point);
  els.insertBeforeBtn.disabled = !hasPoint;
  els.insertAfterBtn.disabled = !hasPoint;
  els.deletePointBtn.disabled = !hasPoint;
  if (!hasPoint) return;
  els.moveStepUpBtn.disabled = point.step_index <= 1;
  els.moveStepDownBtn.disabled = point.step_index >= pointsInSegment(point.segment_id).length;
}

function undo() {
  if (!state.history.length) return;
  state.redo.push(snapshot());
  restoreSnapshot(state.history.pop());
  updateUndoRedo();
  setDirty();
}

function redo() {
  if (!state.redo.length) return;
  state.history.push(snapshot());
  restoreSnapshot(state.redo.pop());
  updateUndoRedo();
  setDirty();
}

function loadVideo(file) {
  if (!file) return;
  if (state.videoObjectUrl) URL.revokeObjectURL(state.videoObjectUrl);
  state.videoObjectUrl = URL.createObjectURL(file);
  els.video.src = state.videoObjectUrl;
  state.videoMeta.fileName = file.name;
  els.fileName.textContent = file.name;
  els.emptyState.style.display = "none";
  if (!els.videoId.value.trim()) {
    els.videoId.value = file.name.replace(/\.[^.]+$/, "");
  }
  els.currentVideoLabel.textContent = els.videoId.value || file.name;
  setDirty();
}

function onVideoMetadata() {
  const v = els.video;
  state.videoMeta.duration = v.duration || 0;
  state.videoMeta.width = v.videoWidth || 0;
  state.videoMeta.height = v.videoHeight || 0;
  state.videoMeta.fps = fps();
  state.videoMeta.totalFrames = Math.round(state.videoMeta.duration * fps());
  els.mediaLayer.style.aspectRatio = `${state.videoMeta.width || 16} / ${state.videoMeta.height || 9}`;
  els.durationInfo.textContent = `${formatNumber(state.videoMeta.duration, 3)}s`;
  els.resolutionInfo.textContent = state.videoMeta.width ? `${state.videoMeta.width} x ${state.videoMeta.height}` : "-";
  els.frameCountInfo.textContent = String(state.videoMeta.totalFrames || "-");
  els.timeline.max = String(state.videoMeta.duration || 0);
  resizeCanvas();
  renderAll();
}

function updateTimeReadout() {
  els.timeline.value = String(els.video.currentTime || 0);
  els.timeReadout.textContent = `${formatNumber(els.video.currentTime || 0, 3)}s`;
  els.frameReadout.textContent = `Frame ${currentFrame()}`;
}

function seekFrames(delta) {
  const duration = els.video.duration || 0;
  const target = clamp((els.video.currentTime || 0) + delta / fps(), 0, duration);
  els.video.currentTime = target;
  updateTimeReadout();
  draw();
}

function togglePlayback() {
  if (!els.video.src) return;
  if (els.video.paused) {
    els.video.play();
  } else {
    els.video.pause();
  }
}

function updatePlayButton() {
  els.playPauseBtn.textContent = els.video.paused ? "Play" : "Pause";
}

function updateSidebarButtons() {
  const leftCollapsed = document.body.classList.contains("left-collapsed");
  const rightCollapsed = document.body.classList.contains("right-collapsed");
  els.leftSidebarToggle.title = leftCollapsed ? "Open left sidebar" : "Collapse left sidebar";
  els.leftSidebarToggle.setAttribute("aria-label", els.leftSidebarToggle.title);
  els.rightSidebarToggle.title = rightCollapsed ? "Open right sidebar" : "Collapse right sidebar";
  els.rightSidebarToggle.setAttribute("aria-label", els.rightSidebarToggle.title);
  const leftArrow = els.leftSidebarToggle.querySelector(".tab-arrow");
  const rightArrow = els.rightSidebarToggle.querySelector(".tab-arrow");
  if (leftArrow) leftArrow.textContent = leftCollapsed ? "›" : "‹";
  if (rightArrow) rightArrow.textContent = rightCollapsed ? "‹" : "›";
}

function toggleSidebar(side) {
  document.body.classList.toggle(`${side}-collapsed`);
  updateSidebarButtons();
  window.setTimeout(() => {
    resizeCanvas();
    draw();
  }, 240);
}

function pauseForAnnotation() {
  if (!els.video.paused) {
    els.video.pause();
  }
  updatePlayButton();
  updateTimeReadout();
}

function resizeCanvas() {
  const rect = els.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.canvas.width = Math.max(1, Math.round((rect.width / state.view.scale) * dpr));
  els.canvas.height = Math.max(1, Math.round((rect.height / state.view.scale) * dpr));
  draw();
}

function applyView() {
  els.mediaLayer.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;
  resizeCanvas();
}

function canvasPointFromEvent(event) {
  const rect = els.canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * (rect.width / state.view.scale);
  const y = ((event.clientY - rect.top) / rect.height) * (rect.height / state.view.scale);
  return { x, y };
}

function videoPointFromEvent(event) {
  const p = canvasPointFromEvent(event);
  const rect = baseCanvasRect();
  return {
    x: clamp((p.x / rect.width) * state.videoMeta.width, 0, state.videoMeta.width),
    y: clamp((p.y / rect.height) * state.videoMeta.height, 0, state.videoMeta.height)
  };
}

function baseCanvasRect() {
  return {
    width: els.canvas.clientWidth,
    height: els.canvas.clientHeight
  };
}

function videoToCanvas(point) {
  const rect = baseCanvasRect();
  return {
    x: (point.pixel_x / (state.videoMeta.width || 1)) * rect.width,
    y: (point.pixel_y / (state.videoMeta.height || 1)) * rect.height
  };
}

function calibrationPointToCanvas(point) {
  return videoToCanvas({ pixel_x: point.x, pixel_y: point.y });
}

function hitTest(event) {
  const p = canvasPointFromEvent(event);
  let best = null;
  let bestDistance = 14;
  state.points.forEach((point) => {
    const cp = videoToCanvas(point);
    const distance = Math.hypot(cp.x - p.x, cp.y - p.y);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  });
  return best;
}

function setCalibrationPoint(event) {
  if (!state.videoMeta.width) return;
  pauseForAnnotation();
  pushHistory();
  const vp = videoPointFromEvent(event);
  const point = {
    x: round(vp.x, 3),
    y: round(vp.y, 3),
    frame_index: currentFrame(),
    timestamp_s: round(els.video.currentTime || 0, 3)
  };
  if (state.calibration.points.length >= 2) {
    state.calibration.points = [point];
  } else {
    state.calibration.points.push(point);
  }
  updateCalibrationScale();
  recalcRealCoordinates();
  renderAll();
  setDirty();
}

function setDirectionPoint(event) {
  if (!state.videoMeta.width) return;
  pauseForAnnotation();
  pushHistory();
  const segment = activeSegment();
  const vp = videoPointFromEvent(event);
  const point = {
    x: round(vp.x, 3),
    y: round(vp.y, 3),
    frame_index: currentFrame(),
    timestamp_s: round(els.video.currentTime || 0, 3)
  };
  if (segment.directionPoints.length >= 2) {
    segment.directionPoints = [point];
  } else {
    segment.directionPoints.push(point);
  }
  recalcRealCoordinates();
  renderAll();
  setDirty();
}

function setGroundPlanePoint(event) {
  if (!state.videoMeta.width) return;
  pauseForAnnotation();
  pushHistory();
  const vp = videoPointFromEvent(event);
  const point = {
    x: round(vp.x, 3),
    y: round(vp.y, 3),
    frame_index: currentFrame(),
    timestamp_s: round(els.video.currentTime || 0, 3)
  };
  if (state.calibration.groundPlanePoints.length >= 4) {
    state.calibration.groundPlanePoints = [point];
  } else {
    state.calibration.groundPlanePoints.push(point);
  }
  recalcRealCoordinates();
  renderAll();
  setDirty();
}

function updateCalibrationScale() {
  state.calibration = normalizeCalibration(state.calibration);
  state.calibration.knownDistanceCm = Number(els.knownDistance.value) || 0;
  state.calibration.note = els.scaleNote.value.trim();
  if (state.calibration.points.length < 2 || state.calibration.knownDistanceCm <= 0) {
    state.calibration.cmPerPixel = null;
    return;
  }
  const [a, b] = state.calibration.points;
  const pixelDistance = Math.hypot(b.x - a.x, b.y - a.y);
  state.calibration.cmPerPixel = pixelDistance > 0 ? state.calibration.knownDistanceCm / pixelDistance : null;
}

function normalizeCalibration(calibration = {}) {
  return {
    points: Array.isArray(calibration.points) ? calibration.points : [],
    groundPlanePoints: Array.isArray(calibration.groundPlanePoints) ? calibration.groundPlanePoints : [],
    directionPoints: Array.isArray(calibration.directionPoints) ? calibration.directionPoints : [],
    knownDistanceCm: calibration.knownDistanceCm ?? calibration.known_distance_cm ?? 100,
    cmPerPixel: calibration.cmPerPixel ?? null,
    note: calibration.note || ""
  };
}

function groundPlaneDimensions() {
  const length = Number(els.carpetLength.value);
  const width = Number(els.carpetWidth.value);
  if (!Number.isFinite(length) || !Number.isFinite(width) || length <= 0 || width <= 0) return null;
  return { length, width };
}

function groundPlaneHomography() {
  const points = state.calibration.groundPlanePoints;
  const dims = groundPlaneDimensions();
  if (points.length !== 4 || !dims) return null;
  const dst = [
    { x: 0, y: 0 },
    { x: dims.length, y: 0 },
    { x: dims.length, y: dims.width },
    { x: 0, y: dims.width }
  ];
  return computeHomography(points, dst);
}

function groundPlaneImageHomography() {
  const points = state.calibration.groundPlanePoints;
  const dims = groundPlaneDimensions();
  if (points.length !== 4 || !dims) return null;
  const src = [
    { x: 0, y: 0 },
    { x: dims.length, y: 0 },
    { x: dims.length, y: dims.width },
    { x: 0, y: dims.width }
  ];
  return computeHomography(src, points);
}

function computeHomography(src, dst) {
  const matrix = [];
  const values = [];
  src.forEach((point, index) => {
    const x = point.x;
    const y = point.y;
    const X = dst[index].x;
    const Y = dst[index].y;
    matrix.push([x, y, 1, 0, 0, 0, -X * x, -X * y]);
    values.push(X);
    matrix.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]);
    values.push(Y);
  });
  const h = solveLinearSystem(matrix, values);
  return h ? [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1] : null;
}

function solveLinearSystem(matrix, values) {
  const n = values.length;
  const a = matrix.map((row, index) => [...row, values[index]]);
  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivotRow][col])) pivotRow = row;
    }
    if (Math.abs(a[pivotRow][col]) < 1e-9) return null;
    [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
    const pivot = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= pivot;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map((row) => row[n]);
}

function applyHomography(h, x, y) {
  const point = transformPoint(h, x, y);
  return point ? {
    real_x_cm: round(point.x, 3),
    real_y_cm: round(point.y, 3)
  } : null;
}

function transformPoint(h, x, y) {
  const denominator = h[6] * x + h[7] * y + h[8];
  if (Math.abs(denominator) < 1e-9) return null;
  return {
    x: (h[0] * x + h[1] * y + h[2]) / denominator,
    y: (h[3] * x + h[4] * y + h[5]) / denominator
  };
}

function directionPoints(segmentId = state.activeSegmentId) {
  const c = state.calibration;
  const segment = segmentById(segmentId);
  if (segment?.directionPoints?.length === 2) return segment.directionPoints;
  if (c.directionPoints.length === 2) return c.directionPoints;
  if (c.points.length === 2) return c.points;
  return null;
}

function projectionBasis(segmentId = state.activeSegmentId) {
  const c = state.calibration;
  const axis = directionPoints(segmentId);
  if (!c.cmPerPixel || c.points.length < 2 || !axis) return null;
  const [origin] = c.points;
  const [a, b] = axis;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (!length) return null;
  const ux = dx / length;
  const uy = dy / length;
  return {
    origin,
    ux,
    uy,
    vx: -uy,
    vy: ux
  };
}

function pixelToReal(pixelX, pixelY, segmentId = state.activeSegmentId) {
  const groundPlane = groundPlaneHomography();
  if (groundPlane) {
    const real = applyHomography(groundPlane, pixelX, pixelY);
    if (real) return real;
  }
  const c = state.calibration;
  const basis = projectionBasis(segmentId);
  if (!basis) {
    return { real_x_cm: "", real_y_cm: "" };
  }
  const rx = pixelX - basis.origin.x;
  const ry = pixelY - basis.origin.y;
  return {
    real_x_cm: round((rx * basis.ux + ry * basis.uy) * c.cmPerPixel, 3),
    real_y_cm: round((rx * basis.vx + ry * basis.vy) * c.cmPerPixel, 3)
  };
}

function recalcRealCoordinates() {
  state.points = state.points.map((point) => ({
    ...point,
    ...pixelToReal(point.pixel_x, point.pixel_y, point.segment_id)
  }));
}

function addFootstep(side, event) {
  if (!state.videoMeta.width) return;
  pauseForAnnotation();
  pushHistory();
  const vp = videoPointFromEvent(event);
  const segmentId = state.activeSegmentId;
  const real = pixelToReal(vp.x, vp.y, segmentId);
  const point = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
    video_id: els.videoId.value.trim(),
    segment_id: segmentId,
    step_index: pointsInSegment(segmentId).length + 1,
    foot_side: side,
    landmark_type: els.landmarkType.value,
    frame_index: currentFrame(),
    timestamp_s: round(els.video.currentTime || 0, 3),
    pixel_x: round(vp.x, 3),
    pixel_y: round(vp.y, 3),
    real_x_cm: real.real_x_cm,
    real_y_cm: real.real_y_cm,
    confidence: els.confidence.value,
    note: ""
  };
  state.points.push(point);
  state.selectedPointId = point.id;
  renumberPoints(state.orderingMode);
  if (els.autoSwitch.checked) setMode(side === "left" ? "right" : "left");
  renderAll();
  setDirty();
}

function renumberPoints(mode = state.orderingMode) {
  state.segments.forEach((segment) => {
    orderedPoints(mode, segment.id).forEach((point, index) => {
      point.segment_id = segment.id;
      point.step_index = index + 1;
      point.video_id = els.videoId.value.trim();
    });
  });
}

function sortedPoints() {
  return orderedPoints(state.orderingMode);
}

function orderedPoints(mode = "time", segmentId = null) {
  const points = segmentId ? pointsInSegment(segmentId) : [...state.points];
  const bySegment = (a, b) => {
    if (a.segment_id !== b.segment_id) return segmentIndex(a.segment_id) - segmentIndex(b.segment_id);
    return 0;
  };
  if (mode === "manual") {
    return [...points].sort((a, b) => {
      const segmentOrder = bySegment(a, b);
      if (segmentOrder) return segmentOrder;
      if (a.step_index !== b.step_index) return normalizedStepIndex(a) - normalizedStepIndex(b);
      if (a.timestamp_s !== b.timestamp_s) return a.timestamp_s - b.timestamp_s;
      return String(a.id).localeCompare(String(b.id));
    });
  }
  return [...points].sort((a, b) => {
    const segmentOrder = bySegment(a, b);
    if (segmentOrder) return segmentOrder;
    if (a.timestamp_s !== b.timestamp_s) return a.timestamp_s - b.timestamp_s;
    return a.step_index - b.step_index;
  });
}

function normalizedStepIndex(point) {
  const value = Number(point.step_index);
  return Number.isFinite(value) && value > 0 ? value : Number.MAX_SAFE_INTEGER;
}

function selectedPoint() {
  return state.points.find((p) => p.id === state.selectedPointId);
}

function clampStepIndex(value, max = pointsInSegment(state.activeSegmentId).length) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  return clamp(n, 1, Math.max(1, max));
}

function setManualOrderFromList(points) {
  state.orderingMode = "manual";
  points.forEach((point, index) => {
    point.step_index = index + 1;
    point.video_id = els.videoId.value.trim();
  });
}

function movePointToStep(pointId, targetIndex) {
  const point = state.points.find((p) => p.id === pointId);
  if (!point) return false;
  const ordered = orderedPoints(state.orderingMode, point.segment_id).filter((p) => p.id !== pointId);
  const insertAt = clampStepIndex(targetIndex, pointsInSegment(point.segment_id).length) - 1;
  ordered.splice(insertAt, 0, point);
  setManualOrderFromList(ordered);
  return true;
}

function sortByEditedStep(pointId, targetIndex) {
  const point = state.points.find((p) => p.id === pointId);
  if (!point) return false;
  point.step_index = clampStepIndex(targetIndex, pointsInSegment(point.segment_id).length);
  const ordered = pointsInSegment(point.segment_id).sort((a, b) => {
    if (a.step_index !== b.step_index) return normalizedStepIndex(a) - normalizedStepIndex(b);
    if (a.id === pointId) return -1;
    if (b.id === pointId) return 1;
    if (a.timestamp_s !== b.timestamp_s) return a.timestamp_s - b.timestamp_s;
    return String(a.id).localeCompare(String(b.id));
  });
  setManualOrderFromList(ordered);
  return true;
}

function applyStepOrder() {
  const point = selectedPoint();
  if (!point) return;
  const targetIndex = clampStepIndex(els.selectedStepIndex.value, pointsInSegment(point.segment_id).length);
  if (!targetIndex) {
    els.selectedStepIndex.value = point.step_index;
    return;
  }
  pushHistory();
  const changed = els.selectedOrderMode.value === "sort"
    ? sortByEditedStep(point.id, targetIndex)
    : movePointToStep(point.id, targetIndex);
  if (!changed) return;
  renderAll();
  setDirty();
}

function moveSelectedPoint(delta) {
  const point = selectedPoint();
  if (!point) return;
  const targetIndex = clampStepIndex(point.step_index + delta, pointsInSegment(point.segment_id).length);
  if (!targetIndex || targetIndex === point.step_index) return;
  pushHistory();
  movePointToStep(point.id, targetIndex);
  renderAll();
  setDirty();
}

function inferInsertedFootSide(reference) {
  if (state.mode === "left" || state.mode === "right") return state.mode;
  return reference.foot_side === "left" ? "right" : "left";
}

function insertPointRelative(position) {
  const reference = selectedPoint();
  if (!reference) return;
  pushHistory();
  const currentTime = els.video.currentTime || reference.timestamp_s || 0;
  const real = pixelToReal(reference.pixel_x, reference.pixel_y, reference.segment_id);
  const point = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
    video_id: els.videoId.value.trim(),
    segment_id: reference.segment_id,
    step_index: reference.step_index + (position === "after" ? 1 : 0),
    foot_side: inferInsertedFootSide(reference),
    landmark_type: els.landmarkType.value || reference.landmark_type,
    frame_index: currentFrame(),
    timestamp_s: round(currentTime, 3),
    pixel_x: reference.pixel_x,
    pixel_y: reference.pixel_y,
    real_x_cm: real.real_x_cm,
    real_y_cm: real.real_y_cm,
    confidence: els.confidence.value || reference.confidence,
    note: position === "after" ? "inserted after selected point" : "inserted before selected point"
  };
  state.points.push(point);
  state.selectedPointId = point.id;
  movePointToStep(point.id, point.step_index);
  renderAll();
  setDirty();
}

function selectPoint(id) {
  state.selectedPointId = id;
  renderSelectedEditor();
  renderTable();
  draw();
  updatePointActionButtons();
}

function deleteSelectedPoint() {
  if (!state.selectedPointId) return;
  pushHistory();
  state.points = state.points.filter((point) => point.id !== state.selectedPointId);
  state.selectedPointId = null;
  renumberPoints();
  renderAll();
  setDirty();
}

function clearAllAnnotations() {
  const hasAnnotationData = state.points.length
    || state.segments.some((segment) => segment.directionPoints.length)
    || state.calibration.points.length
    || state.calibration.groundPlanePoints.length
    || state.calibration.directionPoints.length;
  if (!hasAnnotationData) return;
  const confirmed = confirm(
    "Clear all annotation points, calibration points, ground points, and direction points?\n\n" +
    "The loaded video and metadata will be kept. You can restore this action with Undo."
  );
  if (!confirmed) return;

  pushHistory();
  state.calibration = normalizeCalibration({
    ...state.calibration,
    points: [],
    groundPlanePoints: [],
    directionPoints: [],
    cmPerPixel: null
  });
  state.points = [];
  state.segments = [{ id: "segment_1", label: "Segment 1", type: "straight", directionPoints: [] }];
  state.activeSegmentId = "segment_1";
  state.selectedPointId = null;
  state.draggingPointId = null;
  state.hoverPointId = null;
  renderAll();
  setDirty();
}

function updateSelectedPointFromForm() {
  const point = state.points.find((p) => p.id === state.selectedPointId);
  if (!point) return;
  const previousSegment = point.segment_id;
  point.segment_id = els.selectedSegment.value;
  point.foot_side = els.selectedFoot.value;
  point.landmark_type = els.selectedLandmark.value;
  point.confidence = els.selectedConfidence.value;
  point.note = els.selectedNote.value;
  if (point.segment_id !== previousSegment) {
    state.activeSegmentId = point.segment_id;
    Object.assign(point, pixelToReal(point.pixel_x, point.pixel_y, point.segment_id));
  }
  renderAll();
  setDirty();
}

function calculations() {
  const rows = [];
  state.segments.forEach((segment) => {
    const segmentRows = orderedPoints(state.orderingMode, segment.id).map((point) => ({ ...point }));
    segmentRows.forEach((point, index) => {
      const previous = segmentRows[index - 1];
      const previousSame = [...segmentRows].slice(0, index).reverse().find((p) => p.foot_side === point.foot_side);
      point.segment_label = segmentLabel(point.segment_id);
      point.segment_type = normalizeSegmentType(segment.type);
      point.segment_type_label = segmentTypeLabel(point.segment_type);
      point.step_length_cm = "";
      point.stride_length_cm = "";
      point.step_width_cm = "";
      point.step_time_s = "";
      if (previous && isReal(point) && isReal(previous)) {
        point.step_time_s = round(point.timestamp_s - previous.timestamp_s, 3);
        if (previous.foot_side !== point.foot_side) {
          point.step_length_cm = round(Math.abs(point.real_x_cm - previous.real_x_cm), 3);
          point.step_width_cm = round(Math.abs(point.real_y_cm - previous.real_y_cm), 3);
        }
      }
      if (previousSame && isReal(point) && isReal(previousSame)) {
        point.stride_length_cm = round(Math.abs(point.real_x_cm - previousSame.real_x_cm), 3);
      }
    });
    rows.push(...segmentRows);
  });

  const straightRows = rows.filter((point) => segmentTypeMeta(point.segment_type).straight);
  const fullTrialRows = rows.filter((point) => segmentTypeMeta(point.segment_type).full);

  return {
    rows,
    summary: buildSummary(straightRows, "straight_only"),
    summaries: {
      straight_only: buildSummary(straightRows, "straight_only"),
      full_trial: buildSummary(fullTrialRows, "full_trial")
    }
  };
}

function buildSummary(rows, metricSet) {
  const stepLengths = rows.map((p) => p.step_length_cm).filter(isNumber);
  const leftStepLengths = rows.filter((p) => p.foot_side === "left").map((p) => p.step_length_cm).filter(isNumber);
  const rightStepLengths = rows.filter((p) => p.foot_side === "right").map((p) => p.step_length_cm).filter(isNumber);
  const strideLengths = rows.map((p) => p.stride_length_cm).filter(isNumber);
  const widths = rows.map((p) => p.step_width_cm).filter(isNumber);
  const times = rows.map((p) => p.step_time_s).filter((v) => isNumber(v) && v >= 0);
  const segmentIds = [...new Set(rows.map((point) => point.segment_id))];
  const segmentDistances = segmentIds.map((segmentId) => {
    const realRows = rows.filter((p) => p.segment_id === segmentId && isReal(p));
    const duration = realRows.length > 1 ? realRows[realRows.length - 1].timestamp_s - realRows[0].timestamp_s : 0;
    const distance = realRows.length > 1
      ? Math.max(...realRows.map((p) => p.real_x_cm)) - Math.min(...realRows.map((p) => p.real_x_cm))
      : 0;
    return { duration, distance };
  });
  const duration = segmentDistances.reduce((sum, item) => sum + Math.max(0, item.duration), 0);
  const distance = segmentDistances.reduce((sum, item) => sum + Math.max(0, item.distance), 0);

  return {
    video_id: els.videoId.value.trim(),
    metric_set: metricSet,
    segment_count: segmentIds.length,
    valid_step_count: rows.length,
    mean_step_length_cm: avg(stepLengths),
    mean_left_step_length_cm: avg(leftStepLengths),
    mean_right_step_length_cm: avg(rightStepLengths),
    mean_stride_length_cm: avg(strideLengths),
    mean_step_width_cm: avg(widths),
    mean_step_time_s: avg(times),
    gait_speed_cm_s: duration > 0 ? round(distance / duration, 3) : "",
    annotation_quality: els.usabilityGrade.value,
    truth_source: metricSet === "straight_only" ? "Manual straight-only annotation" : "Manual full-trial annotation",
    calibration_method: calibrationMethod(),
    note: els.videoNote.value.trim()
  };
}

function qualityChecks(calc = calculations()) {
  const checks = [];
  const hasGroundPlane = Boolean(groundPlaneHomography());
  if (!state.videoMeta.fileName) checks.push(["warn", "No video is loaded."]);
  if (hasGroundPlane) checks.push(["ok", "Ground plane ready: using physical X/Y coordinates."]);
  else if (!state.calibration.cmPerPixel) checks.push(["error", "Calibration is missing. Add a ground plane or two calibration points and a known distance."]);
  else checks.push(["ok", `Calibration ready: ${formatNumber(state.calibration.cmPerPixel, 4)} cm per pixel.`]);
  if (state.calibration.groundPlanePoints.length > 0 && !groundPlaneHomography()) {
    checks.push(["warn", "Ground plane is incomplete. Click four ground points and enter carpet length and width."]);
  }
  const segmentsMissingDirection = state.segments
    .filter((segment) => pointsInSegment(segment.id).length > 0 && segment.directionPoints.length < 2);
  if (!hasGroundPlane && state.calibration.cmPerPixel && segmentsMissingDirection.length) {
    checks.push(["warn", `${segmentsMissingDirection.length} annotated segment(s) do not have their own walking direction. Step length is using the calibration line as the forward axis there.`]);
  }
  const shortSegments = state.segments
    .map((segment) => ({ segment, count: pointsInSegment(segment.id).length }))
    .filter((item) => item.count > 0 && normalizeSegmentType(item.segment.type) === "straight" && item.count < 6);
  const straightCount = calc.summaries.straight_only.valid_step_count;
  const fullCount = calc.summaries.full_trial.valid_step_count;
  const nonStraightIncluded = state.segments
    .filter((segment) => pointsInSegment(segment.id).length > 0 && segmentTypeMeta(segment.type).full && !segmentTypeMeta(segment.type).straight).length;
  if (straightCount < 6) checks.push(["warn", "Fewer than 6 straight footstep points. Standard gait truth usually needs at least 6 consecutive straight-walk points."]);
  else checks.push(["ok", `${straightCount} straight footstep points available for standard gait truth.`]);
  if (nonStraightIncluded) {
    checks.push(["warn", `${nonStraightIncluded} non-straight segment(s) are included in full-trial metrics for PosePro alignment only.`]);
  }
  if (fullCount !== state.points.length) {
    checks.push(["ok", `${state.points.length - fullCount} point(s) are in excluded segments and will not enter summary metrics.`]);
  }
  if (shortSegments.length) {
    checks.push(["warn", `${shortSegments.length} straight segment(s) have fewer than 6 points; review segment-level metrics before use.`]);
  }

  const rows = calc.rows;
  const sameFootPairs = rows.filter((p, i) => i > 0 && rows[i - 1].segment_id === p.segment_id && rows[i - 1].foot_side === p.foot_side).length;
  if (sameFootPairs) checks.push(["warn", `${sameFootPairs} adjacent events have the same foot label.`]);

  const negativeTime = rows.filter((p, i) => i > 0 && rows[i - 1].segment_id === p.segment_id && p.timestamp_s < rows[i - 1].timestamp_s).length;
  if (negativeTime) checks.push(["error", "Timestamps are not increasing."]);

  const abnormalSteps = rows.filter((p) => isNumber(p.step_length_cm) && (p.step_length_cm < 10 || p.step_length_cm > 140)).length;
  if (abnormalSteps) checks.push(["warn", `${abnormalSteps} step lengths are outside the 10 to 140 cm review band.`]);

  const lowConfidence = rows.filter((p) => p.confidence === "low").length;
  if (lowConfidence) checks.push(["warn", `${lowConfidence} low-confidence annotations need review.`]);

  const md = metadata();
  if (isNumber(md.carpet_length_cm) || isNumber(md.carpet_width_cm)) {
    const outside = rows.filter((p) => {
      if (!isReal(p)) return false;
      const outsideX = isNumber(md.carpet_length_cm) && (p.real_x_cm < 0 || p.real_x_cm > md.carpet_length_cm);
      const outsideY = isNumber(md.carpet_width_cm) && Math.abs(p.real_y_cm) > md.carpet_width_cm;
      return outsideX || outsideY;
    }).length;
    if (outside) checks.push(["warn", `${outside} points are outside the entered carpet bounds.`]);
  }

  if (!checks.some(([type]) => type !== "ok")) checks.push(["ok", "No blocking quality issues detected."]);
  return checks;
}

function renderAll() {
  state.calibration = normalizeCalibration(state.calibration);
  state.segments = normalizeSegments(state.segments, state.points);
  if (!state.segments.some((segment) => segment.id === state.activeSegmentId)) state.activeSegmentId = state.segments[0].id;
  renumberPoints();
  updateCalibrationScale();
  renderSegmentControls();
  renderCalibrationStatus();
  renderSelectedEditor();
  renderTable();
  renderResults();
  renderQuality();
  updateTimeReadout();
  draw();
  updateUndoRedo();
  updatePointActionButtons();
}

function renderSegmentControls() {
  const options = state.segments.map((segment) => {
    const selected = segment.id === state.activeSegmentId ? " selected" : "";
    const count = pointsInSegment(segment.id).length;
    return `<option value="${escapeHtml(segment.id)}"${selected}>${escapeHtml(segment.label)} - ${escapeHtml(segmentTypeLabel(segment.type))} (${count})</option>`;
  }).join("");
  els.segmentSelect.innerHTML = options;
  const segment = activeSegment();
  els.segmentTypeSelect.value = normalizeSegmentType(segment.type);
}

function renderCalibrationStatus() {
  const c = state.calibration;
  if (c.cmPerPixel && c.points.length === 2) {
    const pixelDistance = Math.hypot(c.points[1].x - c.points[0].x, c.points[1].y - c.points[0].y);
    els.calibrationStatus.textContent = `Calibrated: ${formatNumber(c.cmPerPixel, 4)} cm/px from ${formatNumber(pixelDistance, 2)} px.`;
  } else if (c.points.length === 1) {
    els.calibrationStatus.textContent = "Calibration point 1 set. Click point 2.";
  } else {
    els.calibrationStatus.textContent = "Not calibrated";
  }

  const groundDims = groundPlaneDimensions();
  if (groundPlaneHomography()) {
    els.groundStatus.textContent = "Ground plane set. Foot points convert directly to physical X/Y coordinates.";
  } else if (c.groundPlanePoints.length > 0) {
    const missingSize = groundDims ? "" : " Enter carpet length and width.";
    els.groundStatus.textContent = `Ground point ${c.groundPlanePoints.length}/4 set.${missingSize}`;
  } else {
    els.groundStatus.textContent = "Ground plane not set";
  }

  const segment = activeSegment();
  if (segment.directionPoints.length === 2) {
    els.directionStatus.textContent = `${segment.label} direction set. X = forward projection, Y = perpendicular width.`;
  } else if (segment.directionPoints.length === 1) {
    els.directionStatus.textContent = `${segment.label} direction point 1 set. Click point 2 along this straight walking direction.`;
  } else if (c.points.length === 2) {
    els.directionStatus.textContent = `${segment.label} direction not set. Using calibration line as X axis.`;
  } else {
    els.directionStatus.textContent = `${segment.label} direction not set`;
  }
}

function renderSelectedEditor() {
  const point = selectedPoint();
  els.selectedEmpty.hidden = Boolean(point);
  els.selectedForm.hidden = !point;
  if (!point) return;
  els.selectedSegment.innerHTML = state.segments.map((segment) => {
    const selected = segment.id === point.segment_id ? " selected" : "";
    return `<option value="${escapeHtml(segment.id)}"${selected}>${escapeHtml(segment.label)} - ${escapeHtml(segmentTypeLabel(segment.type))}</option>`;
  }).join("");
  els.selectedStepIndex.max = String(Math.max(1, pointsInSegment(point.segment_id).length));
  els.selectedStepIndex.value = point.step_index;
  els.selectedFoot.value = point.foot_side;
  els.selectedLandmark.value = point.landmark_type;
  els.selectedConfidence.value = point.confidence;
  els.selectedNote.value = point.note || "";
}

function renderTable() {
  const rows = calculations().rows;
  els.pointCount.textContent = String(rows.length);
  els.pointsTable.innerHTML = "";
  rows.forEach((point) => {
    const tr = document.createElement("tr");
    tr.className = point.id === state.selectedPointId ? "selected-row" : "";
    tr.innerHTML = `
      <td>${escapeHtml(point.segment_label || segmentLabel(point.segment_id))}</td>
      <td>${escapeHtml(point.segment_type_label || segmentTypeLabel(point.segment_type))}</td>
      <td>${point.step_index}</td>
      <td>${escapeHtml(point.foot_side)}</td>
      <td>${point.frame_index}</td>
      <td>${display(point.real_x_cm)}</td>
      <td>${display(point.real_y_cm)}</td>
      <td>${display(point.step_length_cm)}</td>
      <td>${display(point.stride_length_cm)}</td>
    `;
    tr.addEventListener("click", () => selectPoint(point.id));
    els.pointsTable.appendChild(tr);
  });
}

function renderResults() {
  const calc = calculations();
  const summary = calc.summaries.straight_only;
  const full = calc.summaries.full_trial;
  const metrics = [
    ["Straight segs", summary.segment_count],
    ["Straight steps", summary.valid_step_count],
    ["Straight step", cm(summary.mean_step_length_cm)],
    ["Straight speed", speed(summary.gait_speed_cm_s)],
    ["Full segs", full.segment_count],
    ["Full steps", full.valid_step_count],
    ["Full step", cm(full.mean_step_length_cm)],
    ["Full speed", speed(full.gait_speed_cm_s)]
  ];
  els.resultsGrid.innerHTML = metrics.map(([label, value]) => `
    <div class="metric-card"><span>${label}</span><strong>${value}</strong></div>
  `).join("");
}

function renderQuality() {
  const checks = qualityChecks();
  els.qualityList.innerHTML = checks.map(([type, text]) => `<li class="${type}">${escapeHtml(text)}</li>`).join("");
}

function draw() {
  const canvas = els.canvas;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  drawCalibration(ctx);
  drawGroundPlane(ctx);
  drawDirection(ctx);
  drawAxes(ctx);
  drawFootsteps(ctx);
  if (state.mode === "measure") drawMeasurements(ctx);
}

function drawCalibration(ctx) {
  const pts = state.calibration.points.map(calibrationPointToCanvas);
  if (pts.length) {
    ctx.strokeStyle = "#4fae78";
    ctx.fillStyle = "#4fae78";
    ctx.lineWidth = 2;
    if (pts.length === 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
    }
    pts.forEach((p, index) => {
      circle(ctx, p.x, p.y, 6, "#4fae78", "#ffffff", 2);
      label(ctx, `C${index + 1}`, p.x + 9, p.y - 9, "#2f704f");
    });
  }
}

function drawDirection(ctx) {
  const pts = (activeSegment().directionPoints || []).map(calibrationPointToCanvas);
  if (!pts.length) return;
  ctx.strokeStyle = "#8a5bb8";
  ctx.fillStyle = "#8a5bb8";
  ctx.lineWidth = 2;
  if (pts.length === 2) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(pts[1].x, pts[1].y);
    ctx.stroke();
  }
  pts.forEach((p, index) => {
    circle(ctx, p.x, p.y, 6, "#8a5bb8", "#ffffff", 2);
    label(ctx, `D${index + 1}`, p.x + 9, p.y - 9, "#6d4097");
  });
}

function drawGroundPlane(ctx) {
  const pts = state.calibration.groundPlanePoints.map(calibrationPointToCanvas);
  if (!pts.length) return;
  ctx.strokeStyle = "#397f82";
  ctx.fillStyle = "#397f82";
  ctx.lineWidth = 2;
  if (pts.length > 1) {
    ctx.beginPath();
    pts.forEach((p, index) => {
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    if (pts.length === 4) ctx.closePath();
    ctx.stroke();
  }
  pts.forEach((p, index) => {
    circle(ctx, p.x, p.y, 6, "#397f82", "#ffffff", 2);
    label(ctx, `G${index + 1}`, p.x + 9, p.y - 9, "#2c6b6e");
  });
}

function drawAxes(ctx) {
  const basis = projectionBasis();
  if (!basis) return;
  const origin = calibrationPointToCanvas(basis.origin);
  const dx = basis.ux;
  const dy = basis.uy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const axisLength = 130;
  ctx.strokeStyle = "rgba(77, 143, 217, 0.9)";
  ctx.lineWidth = 2;
  arrow(ctx, origin.x, origin.y, origin.x + ux * axisLength, origin.y + uy * axisLength);
  ctx.strokeStyle = "rgba(242, 153, 74, 0.9)";
  arrow(ctx, origin.x, origin.y, origin.x - uy * axisLength * 0.7, origin.y + ux * axisLength * 0.7);
  label(ctx, "X", origin.x + ux * axisLength + 6, origin.y + uy * axisLength, "#2f70ba");
  label(ctx, "Y", origin.x - uy * axisLength * 0.7 + 6, origin.y + ux * axisLength * 0.7, "#b96f25");
}

function drawFootsteps(ctx) {
  const pts = sortedPoints();
  state.segments.forEach((segment) => {
    const segmentPoints = orderedPoints(state.orderingMode, segment.id);
    if (segmentPoints.length <= 1) return;
    ctx.strokeStyle = "rgba(65, 83, 101, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    segmentPoints.forEach((point, index) => {
      const p = videoToCanvas(point);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  });

  pts.forEach((point) => {
    const p = videoToCanvas(point);
    const color = point.foot_side === "left" ? "#2f80ed" : "#f2994a";
    const isSelected = point.id === state.selectedPointId;
    circle(ctx, p.x, p.y, isSelected ? 9 : 7, color, "#ffffff", isSelected ? 3 : 2);
    const text = state.segments.length > 1 ? `${segmentIndex(point.segment_id)}.${point.step_index}` : String(point.step_index);
    label(ctx, text, p.x + 10, p.y - 10, color);
  });
}

function drawMeasurements(ctx) {
  const rows = calculations().rows;
  const groundToImage = groundPlaneImageHomography();
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  rows.forEach((point, index) => {
    if (index === 0 || !isNumber(point.step_length_cm)) return;
    const previous = rows[index - 1];
    if (previous.foot_side === point.foot_side) return;
    const a = videoToCanvas(previous);
    const b = videoToCanvas(point);
    if (groundToImage && isReal(point) && isReal(previous)) {
      const projectedImage = transformPoint(groundToImage, point.real_x_cm, previous.real_y_cm);
      if (!projectedImage) return;
      const projected = calibrationPointToCanvas(projectedImage);
      ctx.strokeStyle = "rgba(47, 102, 177, 0.82)";
      ctx.lineWidth = 2;
      arrow(ctx, a.x, a.y, projected.x, projected.y);
      ctx.strokeStyle = "rgba(199, 123, 45, 0.72)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(projected.x, projected.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `${formatNumber(point.step_length_cm, 1)} cm`, (a.x + projected.x) / 2 + 4, (a.y + projected.y) / 2 + 4, "#405468");
    } else {
      const basis = projectionBasis(point.segment_id);
      if (!basis) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        label(ctx, `${formatNumber(point.step_length_cm, 1)} cm`, mx + 4, my + 4, "#405468");
        return;
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const projected = {
        x: a.x + (dx * basis.ux + dy * basis.uy) * basis.ux,
        y: a.y + (dx * basis.ux + dy * basis.uy) * basis.uy
      };
      ctx.strokeStyle = "rgba(47, 102, 177, 0.82)";
      ctx.lineWidth = 2;
      arrow(ctx, a.x, a.y, projected.x, projected.y);
      ctx.strokeStyle = "rgba(199, 123, 45, 0.72)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(projected.x, projected.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, `${formatNumber(point.step_length_cm, 1)} cm`, (a.x + projected.x) / 2 + 4, (a.y + projected.y) / 2 + 4, "#405468");
    }
  });
}

function circle(ctx, x, y, r, fill, stroke, strokeWidth) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function label(ctx, text, x, y, color) {
  ctx.font = "12px Segoe UI, Arial, sans-serif";
  const padX = 5;
  const metrics = ctx.measureText(text);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(x - padX, y - 14, metrics.width + padX * 2, 18);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function arrow(ctx, x1, y1, x2, y2) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angle - Math.PI / 6), y2 - 10 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - 10 * Math.cos(angle + Math.PI / 6), y2 - 10 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
}

function exportProjectJson() {
  const data = {
    app: "AnnoS",
    version: "1.5.0",
    saved_at: new Date().toISOString(),
    metadata: metadata(),
    video_meta: state.videoMeta,
    calibration: state.calibration,
    segments: state.segments,
    active_segment_id: state.activeSegmentId,
    ordering_mode: state.orderingMode,
    points: state.points,
    calculations: calculations()
  };
  downloadText(fileStem("annotation_project", "json"), JSON.stringify(data, null, 2), "application/json");
  setDirty(false);
}

function importProjectJson(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      applyMetadata(data.metadata || {});
      state.videoMeta = { ...state.videoMeta, ...(data.video_meta || {}) };
      state.calibration = normalizeCalibration(data.calibration || state.calibration);
      els.knownDistance.value = state.calibration.knownDistanceCm || 100;
      if (!els.scaleNote.value && state.calibration.note) els.scaleNote.value = state.calibration.note;
      state.points = data.points || [];
      state.segments = normalizeSegments(data.segments, state.points);
      state.activeSegmentId = data.active_segment_id || data.activeSegmentId || state.segments[0].id;
      state.orderingMode = data.ordering_mode || data.orderingMode || "time";
      state.selectedPointId = null;
      recalcRealCoordinates();
      renderAll();
      setDirty(false);
    } catch (error) {
      alert(`Could not load project JSON: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

function applyMetadata(data) {
  els.videoId.value = data.video_id || "";
  els.subjectId.value = data.subject_id || "";
  els.videoDate.value = data.video_date || "";
  els.cameraAngle.value = data.camera_angle || "";
  els.cameraStatus.value = data.camera_status || "fixed";
  els.fpsInput.value = data.fps || 30;
  els.usabilityGrade.value = data.usability_grade || "A";
  els.reviewer.value = data.reviewer || "";
  els.videoNote.value = data.note || "";
  els.carpetLength.value = data.carpet_length_cm || "";
  els.carpetWidth.value = data.carpet_width_cm || "";
  els.scaleNote.value = data.scale_note || "";
  els.knownDistance.value = data.known_distance_cm || state.calibration.knownDistanceCm || 100;
}

function exportCsvs() {
  const calc = calculations();
  const md = metadata();
  const now = new Date().toISOString();
  const metaRow = {
    video_id: md.video_id,
    subject_id: md.subject_id,
    file_name: state.videoMeta.fileName,
    fps: md.fps,
    resolution: state.videoMeta.width ? `${state.videoMeta.width}x${state.videoMeta.height}` : "",
    duration_s: round(state.videoMeta.duration, 3),
    camera_angle: md.camera_angle,
    camera_status: md.camera_status,
    carpet_length_cm: md.carpet_length_cm,
    carpet_width_cm: md.carpet_width_cm,
    calibration_method: calibrationMethod(),
    segment_count: state.segments.length,
    segment_type_counts: segmentTypeCountsText(),
    active_segment_id: state.activeSegmentId,
    scale_note: md.scale_note,
    usability_grade: md.usability_grade,
    reviewer: md.reviewer,
    review_time: now,
    note: md.note
  };

  const annotationRows = calc.rows.map((p) => ({
    video_id: md.video_id,
    segment_id: p.segment_id,
    segment_label: p.segment_label || segmentLabel(p.segment_id),
    segment_type: p.segment_type,
    segment_type_label: p.segment_type_label,
    step_index: p.step_index,
    foot_side: p.foot_side,
    landmark_type: p.landmark_type,
    frame_index: p.frame_index,
    timestamp_s: p.timestamp_s,
    pixel_x: p.pixel_x,
    pixel_y: p.pixel_y,
    real_x_cm: p.real_x_cm,
    real_y_cm: p.real_y_cm,
    step_length_cm: p.step_length_cm,
    stride_length_cm: p.stride_length_cm,
    step_width_cm: p.step_width_cm,
    step_time_s: p.step_time_s,
    confidence: p.confidence,
    note: p.note || ""
  }));

  const summaryRows = [calc.summaries.straight_only, calc.summaries.full_trial];
  downloadText(fileStem("video_metadata", "csv"), toCsv([metaRow]), "text/csv");
  downloadText(fileStem("manual_footstep_annotations", "csv"), toCsv(annotationRows), "text/csv");
  downloadText(fileStem("manual_gait_truth_summary", "csv"), toCsv(summaryRows), "text/csv");
  setDirty(false);
}

function segmentTypeCountsText() {
  const counts = {};
  state.segments.forEach((segment) => {
    const type = normalizeSegmentType(segment.type);
    counts[type] = (counts[type] || 0) + 1;
  });
  return Object.entries(counts).map(([type, count]) => `${type}:${count}`).join("; ");
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvCell(row[header])).join(","));
  });
  return lines.join("\r\n");
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadText(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fileStem(prefix, ext) {
  const id = els.videoId.value.trim() || "unlabeled_video";
  return `${id}_${prefix}.${ext}`;
}

function isReal(point) {
  return isNumber(point.real_x_cm) && isNumber(point.real_y_cm);
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function avg(values) {
  return values.length ? round(values.reduce((sum, value) => sum + value, 0) / values.length, 3) : "";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, digits = 3) {
  if (!Number.isFinite(value)) return "";
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value, digits = 3) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "-";
}

function display(value) {
  return isNumber(value) ? formatNumber(value, 1) : "-";
}

function cm(value) {
  return isNumber(value) ? `${formatNumber(value, 1)} cm` : "-";
}

function seconds(value) {
  return isNumber(value) ? `${formatNumber(value, 3)} s` : "-";
}

function speed(value) {
  return isNumber(value) ? `${formatNumber(value, 2)} cm/s` : "-";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

document.querySelectorAll(".mode-btn").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

els.videoInput.addEventListener("change", (event) => loadVideo(event.target.files[0]));
els.video.addEventListener("loadedmetadata", onVideoMetadata);
els.video.addEventListener("timeupdate", () => {
  updateTimeReadout();
  draw();
});
els.video.addEventListener("play", updatePlayButton);
els.video.addEventListener("pause", updatePlayButton);
els.playPauseBtn.addEventListener("click", togglePlayback);
els.prevFrameBtn.addEventListener("click", () => seekFrames(-1));
els.nextFrameBtn.addEventListener("click", () => seekFrames(1));
els.jumpBackBtn.addEventListener("click", () => seekFrames(-10));
els.jumpForwardBtn.addEventListener("click", () => seekFrames(10));
els.timeline.addEventListener("input", () => {
  els.video.currentTime = Number(els.timeline.value);
  updateTimeReadout();
});
els.speedSelect.addEventListener("change", () => {
  els.video.playbackRate = Number(els.speedSelect.value);
});
els.knownDistance.addEventListener("input", () => {
  updateCalibrationScale();
  recalcRealCoordinates();
  renderAll();
  setDirty();
});
els.scaleNote.addEventListener("input", () => {
  state.calibration.note = els.scaleNote.value.trim();
  setDirty();
});
els.fpsInput.addEventListener("input", () => {
  state.videoMeta.fps = fps();
  state.videoMeta.totalFrames = Math.round((state.videoMeta.duration || 0) * fps());
  els.frameCountInfo.textContent = String(state.videoMeta.totalFrames || "-");
  renderAll();
  setDirty();
});

[
  els.videoId, els.subjectId, els.videoDate, els.reviewer, els.cameraAngle,
  els.cameraStatus, els.usabilityGrade, els.videoNote, els.carpetLength, els.carpetWidth
].forEach((el) => el.addEventListener("input", () => {
  els.currentVideoLabel.textContent = els.videoId.value.trim() || state.videoMeta.fileName || "No video loaded";
  renumberPoints();
  recalcRealCoordinates();
  renderAll();
  setDirty();
}));

[els.selectedSegment, els.selectedFoot, els.selectedLandmark, els.selectedConfidence, els.selectedNote].forEach((el) => {
  el.addEventListener("input", updateSelectedPointFromForm);
});

els.selectedStepIndex.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyStepOrder();
  }
});

els.canvas.addEventListener("pointerdown", (event) => {
  if (!state.videoMeta.width) return;
  els.canvas.setPointerCapture(event.pointerId);
  if (event.altKey || (state.mode === "select" && !hitTest(event))) {
    state.panning = true;
    state.panStart = { x: event.clientX, y: event.clientY, viewX: state.view.x, viewY: state.view.y };
    return;
  }
  if (state.mode === "calibration") {
    setCalibrationPoint(event);
    return;
  }
  if (state.mode === "ground") {
    setGroundPlanePoint(event);
    return;
  }
  if (state.mode === "direction") {
    setDirectionPoint(event);
    return;
  }
  if (state.mode === "left" || state.mode === "right") {
    addFootstep(state.mode, event);
    return;
  }
  const hit = hitTest(event);
  if (hit) {
    state.draggingPointId = hit.id;
    selectPoint(hit.id);
    pushHistory();
  }
});

els.canvas.addEventListener("pointermove", (event) => {
  if (state.panning && state.panStart) {
    state.view.x = state.panStart.viewX + event.clientX - state.panStart.x;
    state.view.y = state.panStart.viewY + event.clientY - state.panStart.y;
    applyView();
    return;
  }

  if (state.draggingPointId) {
    const point = state.points.find((p) => p.id === state.draggingPointId);
    if (point) {
      const vp = videoPointFromEvent(event);
      point.pixel_x = round(vp.x, 3);
      point.pixel_y = round(vp.y, 3);
      Object.assign(point, pixelToReal(vp.x, vp.y, point.segment_id));
      renderAll();
      setDirty();
    }
    return;
  }

  const hit = hitTest(event);
  state.hoverPointId = hit ? hit.id : null;
  if (hit) {
    const text = `${segmentLabel(hit.segment_id)} #${hit.step_index} ${hit.foot_side}, frame ${hit.frame_index}, ${formatNumber(hit.timestamp_s, 3)}s`;
    els.tooltip.textContent = text;
    els.tooltip.hidden = false;
    els.tooltip.style.left = `${event.clientX + 12}px`;
    els.tooltip.style.top = `${event.clientY + 12}px`;
  } else {
    els.tooltip.hidden = true;
  }
});

els.canvas.addEventListener("pointerup", () => {
  state.draggingPointId = null;
  state.panning = false;
  state.panStart = null;
});

els.canvas.addEventListener("pointerleave", () => {
  els.tooltip.hidden = true;
});

els.videoViewport.addEventListener("wheel", (event) => {
  event.preventDefault();
  const next = clamp(state.view.scale + (event.deltaY < 0 ? 0.12 : -0.12), 0.5, 4);
  state.view.scale = round(next, 2);
  applyView();
}, { passive: false });

els.resetViewBtn.addEventListener("click", () => {
  state.view = { scale: 1, x: 0, y: 0 };
  applyView();
});
els.leftSidebarToggle.addEventListener("click", () => toggleSidebar("left"));
els.rightSidebarToggle.addEventListener("click", () => toggleSidebar("right"));
els.undoBtn.addEventListener("click", undo);
els.redoBtn.addEventListener("click", redo);
els.segmentSelect.addEventListener("change", () => {
  state.activeSegmentId = els.segmentSelect.value;
  renderAll();
  setDirty();
});
els.segmentTypeSelect.addEventListener("change", () => {
  const segment = activeSegment();
  segment.type = normalizeSegmentType(els.segmentTypeSelect.value);
  renderAll();
  setDirty();
});
els.newSegmentBtn.addEventListener("click", createSegment);
els.applyStepOrderBtn.addEventListener("click", applyStepOrder);
els.moveStepUpBtn.addEventListener("click", () => moveSelectedPoint(-1));
els.moveStepDownBtn.addEventListener("click", () => moveSelectedPoint(1));
els.insertBeforeBtn.addEventListener("click", () => insertPointRelative("before"));
els.insertAfterBtn.addEventListener("click", () => insertPointRelative("after"));
els.deletePointBtn.addEventListener("click", deleteSelectedPoint);
els.clearAllBtn.addEventListener("click", clearAllAnnotations);
els.saveProjectBtn.addEventListener("click", exportProjectJson);
els.exportAllBtn.addEventListener("click", exportCsvs);
els.loadProjectBtn.addEventListener("click", () => els.projectInput.click());
els.projectInput.addEventListener("change", (event) => importProjectJson(event.target.files[0]));

window.addEventListener("keydown", (event) => {
  const tag = document.activeElement?.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
  if (event.code === "Space") {
    event.preventDefault();
    togglePlayback();
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    seekFrames(event.shiftKey ? -10 : -1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    seekFrames(event.shiftKey ? 10 : 1);
  } else if (event.key === "Delete" || event.key === "Backspace") {
    event.preventDefault();
    deleteSelectedPoint();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
  }
});

new ResizeObserver(() => resizeCanvas()).observe(els.mediaLayer);

renderAll();
