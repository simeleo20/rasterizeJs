"use strict";

// ======================================================================
//  Low-level canvas access.
// ======================================================================

let canvas = document.getElementById("canvas");
let canvas_context = canvas.getContext("2d");
let canvas_buffer = canvas_context.getImageData(
  0,
  0,
  canvas.width,
  canvas.height
);

let Vw = 1;
let Vh = 1;
let d = 1;

let BLUE = Color(0, 0, 255);
let RED = Color(255, 0, 0);
let GREEN = Color(0, 255, 0);

// A color.
function Color(r, g, b) {
  return {
    r,
    g,
    b,
    mul: function (n) {
      return new Color(this.r * n, this.g * n, this.b * n);
    },
  };
}

// The PutPixel() function.
function PutPixel(x, y, color) {
  x = canvas.width / 2 + (x | 0);
  y = canvas.height / 2 - (y | 0) - 1;
  if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
    return;
  }

  let offset = 4 * (x + canvas_buffer.width * y);
  canvas_buffer.data[offset++] = color.r;
  canvas_buffer.data[offset++] = color.g;
  canvas_buffer.data[offset++] = color.b;
  canvas_buffer.data[offset++] = 255; // Alpha = 255 (full opacity)
}

// Displays the contents of the offscreen buffer into the canvas.
function UpdateCanvas() {
  canvas_context.putImageData(canvas_buffer, 0, 0);
}

// ======================================================================
//  Data model.
// ======================================================================

// A Point.
function Pt(x, y, h) {
  return { x, y, h };
}

function V(x, y, z, h) {
  return { x, y, z, h };
}

// ======================================================================
//  Rasterization code.
// ======================================================================

function Interpolate(i0, d0, i1, d1) {
  if (i0 == i1) {
    return [d0];
  }

  let values = [];
  let a = (d1 - d0) / (i1 - i0);
  let d = d0;
  for (let i = i0; i <= i1; i++) {
    values.push(d);
    d += a;
  }

  return values;
}

function DrawLine(p0, p1, color) {
  let dx = p1.x - p0.x,
    dy = p1.y - p0.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    // The line is horizontal-ish. Make sure it's left to right.
    if (dx < 0) {
      let swap = p0;
      p0 = p1;
      p1 = swap;
    }

    // Compute the Y values and draw.
    let ys = Interpolate(p0.x, p0.y, p1.x, p1.y);
    for (let x = p0.x; x <= p1.x; x++) {
      PutPixel(x, ys[(x - p0.x) | 0], color);
    }
  } else {
    // The line is verical-ish. Make sure it's bottom to top.
    if (dy < 0) {
      let swap = p0;
      p0 = p1;
      p1 = swap;
    }

    // Compute the X values and draw.
    let xs = Interpolate(p0.y, p0.x, p1.y, p1.x);
    for (let y = p0.y; y <= p1.y; y++) {
      PutPixel(xs[(y - p0.y) | 0], y, color);
    }
  }
}

function DrawWireframeTriangle(p0, p1, p2, color) {
  DrawLine(p0, p1, color);
  DrawLine(p1, p2, color);
  DrawLine(p0, p2, color);
}

function DrawShadedTriangle(p0, p1, p2, color) {
  // Sort the points from bottom to top.
  if (p1.y < p0.y) {
    let swap = p0;
    p0 = p1;
    p1 = swap;
  }
  if (p2.y < p0.y) {
    let swap = p0;
    p0 = p2;
    p2 = swap;
  }
  if (p2.y < p1.y) {
    let swap = p1;
    p1 = p2;
    p2 = swap;
  }
  let x01 = Interpolate(p0.y, p0.x, p1.y, p1.x);
  let h01 = Interpolate(p0.y, p0.h, p1.y, p1.h);
  let x12 = Interpolate(p1.y, p1.x, p2.y, p2.x);
  let h12 = Interpolate(p1.y, p1.h, p2.y, p2.h);
  let x02 = Interpolate(p0.y, p0.x, p2.y, p2.x);
  let h02 = Interpolate(p0.y, p0.h, p2.y, p2.h);
  x01.pop();
  h01.pop();
  let x012 = x01.concat(x12);
  let h012 = h01.concat(h12);

  let m = Math.round(x012.length / 2);
  let xLeft;
  let xRight;

  let hLeft;
  let hRight;

  if (x012[m] < x02[m]) {
    xLeft = x012;
    xRight = x02;
    hLeft = h012;
    hRight = h02;
  } else {
    xRight = x012;
    xLeft = x02;
    hRight = h012;
    hLeft = h02;
  }
  console.log(xLeft.length, xRight.length);
  for (let y = p0.y; y <= p2.y; y++) {
    let horizontalColors = Interpolate(
      xLeft[0],
      hLeft[0],
      xRight[0],
      hRight[0]
    );
    console.log(horizontalColors);
    for (let x = xLeft[0]; x <= xRight[0]; x++) {
      PutPixel(x, y, color.mul(horizontalColors[0]));

      horizontalColors.shift();
    }
    xRight.shift();
    xLeft.shift();
    hRight.shift();
    hLeft.shift();
  }
}

function ViewportToCanvas(x, y) {
  return Pt((x * canvas.width) / Vw, (y * canvas.height) / Vh);
}
function ProjectVertex(v) {
  return ViewportToCanvas((v.x * d) / v.z, (v.y * d) / v.z);
}
/*
let p0 = new Pt(100, 50, 0.8);
let p1 = new Pt(500, 350, 0.1);
let p2 = new Pt(320, 550, 1.0);

DrawShadedTriangle(p0, p1, p2, new Color(0, 255, 0));
DrawWireframeTriangle(p0, p1, p2, new Color(255, 0, 0));*/
let vAf = V(-2, -0.5, 5, 1);
let vBf = V(-2, 0.5, 5, 1);
let vCf = V(-1, 0.5, 5, 1);
let vDf = V(-1, -0.5, 5, 1);

// The four "back" vertices
let vAb = V(-2, -0.5, 6, 1);
let vBb = V(-2, 0.5, 6, 1);
let vCb = V(-1, 0.5, 6, 1);
let vDb = V(-1, -0.5, 6, 1);

console.log(ProjectVertex(vAf));

// The front face
DrawLine(ProjectVertex(vAf), ProjectVertex(vBf), BLUE);
DrawLine(ProjectVertex(vBf), ProjectVertex(vCf), BLUE);
DrawLine(ProjectVertex(vCf), ProjectVertex(vDf), BLUE);
DrawLine(ProjectVertex(vDf), ProjectVertex(vAf), BLUE);

// The back face
DrawLine(ProjectVertex(vAb), ProjectVertex(vBb), RED);
DrawLine(ProjectVertex(vBb), ProjectVertex(vCb), RED);
DrawLine(ProjectVertex(vCb), ProjectVertex(vDb), RED);
DrawLine(ProjectVertex(vDb), ProjectVertex(vAb), RED);

// The front-to-back edges
DrawLine(ProjectVertex(vAf), ProjectVertex(vAb), GREEN);
DrawLine(ProjectVertex(vBf), ProjectVertex(vBb), GREEN);
DrawLine(ProjectVertex(vCf), ProjectVertex(vCb), GREEN);
DrawLine(ProjectVertex(vDf), ProjectVertex(vDb), GREEN);
UpdateCanvas();
