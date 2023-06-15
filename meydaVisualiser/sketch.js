// The main circle will be like a beating heart
// The line of circles is like a EKG machine
// The EKG line has to match the tempo of the song so the zigzag is in the middle of the screen
// The EKG line position is reset after song start to make sureiit always falls in the middle of the screen

let mainSong;
let playStopButton;

let circleSize = 0;
let targetCircleSize = 0;
let lerpSpeed = 0.1; // adjust this value to change the speed of interpolation
let colorValue;

let bgColor = 0;
let targetBgColor = 0;

// create circle arrays and populate all with "0"
let circlePos = new Array(12).fill(0);
let circleTargetPos = new Array(12).fill(0);

// array for temporary circles
let specialCircles = [];
let highestChromaIndex = 0;

let timeSinceRMS = 0;
let elapsedTime;

// EKG display based on rms value
let lastPointX = 0;

let fft;

let analyzer;

function preload(){
  soundFormats('mp3', 'wav');

  mainSong = loadSound("./assets/Kalte_Ohren_(_Remix_).mp3");
}

function setup() {
  createCanvas(1200,920);
  // background(180);

  playStopButton = createButton('play');
  playStopButton.position(210,20);
  playStopButton.mousePressed(playStopSound);

  fft = new p5.FFT(0.2, 2048);
}

function draw() {

  if (elapsedTime > 700){
    bgColor = 0;
  } else {
    bgColor = 255;
  }

  // Use lerp to smoothly change background color
  bgColor = lerp(bgColor, targetBgColor, lerpSpeed);

  // Draw a semi-transparent background over the top to enable trails
  fill(bgColor, 155, 255 - bgColor, 20);
  rect(0, 0, width, height);
  push();
  noStroke();
  // Use lerp to smoothly change circle size
  circleSize = lerp(circleSize, targetCircleSize, lerpSpeed);
  
  fill(colorValue,255-colorValue,0);
  circle(width/2, height-height/5, circleSize*2);

  for (let i = 0; i < circlePos.length; i++) {
    circlePos[i] = lerp(circlePos[i], circleTargetPos[i]**1.25, lerpSpeed/3);
  
    fill((i * 20), 255-bgColor, bgColor); // Different color for each circle
    // Evenly spread the circles across the width of the canvas with dynamic y-position
    circle((i + 0.5) * width / circlePos.length, height - circlePos[i], circleSize/4);

    // draw the temporary circle flashes

    for (let i = specialCircles.length - 1; i >= 0; i--) {
      let sc = specialCircles[i];
      sc.y -= 10;
      fill(0,255,0, sc.lifespan);
      circle(sc.x, sc.y, sc.size);
      sc.lifespan -= 2;
      if (sc.lifespan <= 0) {
        specialCircles.splice(i, 1); // Remove the circle when its lifespan is over
      }
    }
    
  }
  pop();

  // draw the EKG line
  push();
  stroke(0,255,0);
  strokeWeight(5);

  let nextPointX = lastPointX + 20.5; // Adjust speed of line here, reduced for more zigzag effect.
  let zigzagHeight = 250; // Adjust the height of the zigzag here.
  let nextPointY;

  if (targetCircleSize / 800 > 0.3) { // If RMS is more than 0.3
    // Create a zigzag pattern. Change the values as you wish to adjust the zigzag pattern.
    let zigzagDirection = (nextPointX % 80 < 40) ? -1 : 1;
    nextPointY = height / 2 + zigzagDirection * ((nextPointX % 40 < 20) ? zigzagHeight : -zigzagHeight);
  } else {
    nextPointY = height / 2; // Draw a straight line in the middle of the screen.
  }

    // Draw a line from the middle to the top or bottom
    line(lastPointX, height / 2, nextPointX, nextPointY);

    // Draw a line back to the middle
    line(nextPointX, nextPointY, nextPointX + 20, height / 2); // +20 to continue zigzag effect

    lastPointX = nextPointX + 20; // Update lastPointX, +20 as we drew an extra line.

    if (lastPointX > width) {
      lastPointX = 0;
      // background(0); // Clears the screen. You can change the background color if you wish.
    }
  pop();

  // print time since 0.3 RMS
  elapsedTime = millis() - timeSinceRMS;
  // console.log('Elapsed time: ' + elapsedTime);
}

function playStopSound(){
  if (mainSong.isPlaying()){
    mainSong.stop();
    playStopButton.html('play');
    if (analyzer) {
        analyzer.stop();
    }
  } else {
    mainSong.loop();
    playStopButton.html('stop');

    // Reset the line's X position
    lastPointX = 300;

    if (typeof Meyda !== "undefined"){
      analyzer = Meyda.createMeydaAnalyzer({
        "audioContext": getAudioContext(),
        "source": mainSong.bufferSourceNode,
        "bufferSize": 512,
        "featureExtractors": ["rms", "loudness", "chroma", "spectralCentroid"],
        "callback": features => {
          targetCircleSize = features.rms*800;

          highestChromaIndex = features.chroma.indexOf(Math.max(...features.chroma));

          // timer for RMS threshold
          if (features.rms > 0.3) {
            timeSinceRMS = millis();
          }
    
          for (let i = 0; i < features.chroma.length; i++) {
            circleTargetPos[i] = map(features.chroma[i], 0, 1, 0, 200);
          }
          if (features.loudness) {
            colorValue = map(features.loudness.total, 0, 40, 0, 255);
          }
          if (features.loudness) {
            targetBgColor = map(features.loudness.total, 0, 40, 0, 255); // update target background color
          }

          // temporary circles
          if (features.spectralCentroid > 60) {
            specialCircles.push({
              x: (highestChromaIndex + 0.5) * width / circlePos.length,
              y: height - circlePos[highestChromaIndex],
              size: 20,
              lifespan: 50,
            });
          }
        }
      });
      analyzer.start();
    }
  }
}
