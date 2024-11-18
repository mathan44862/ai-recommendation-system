import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const EmotionDetector = () => {
  const videoRef = useRef(null); // Webcam video reference
  const iframeRef = useRef(null); // YouTube iframe reference
  const [emotionPercentage, setEmotionPercentage] = useState(null); // Detected emotion percentage
  const [videoStopped, setVideoStopped] = useState(false); // YouTube video stopped flag
  const [detectionStopped, setDetectionStopped] = useState(false); // Emotion detection stopped flag

  useEffect(() => {
    // Load Face API models
    const loadModels = async () => {
      try {
        console.log("Loading models...");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceExpressionNet.loadFromUri("/models");
        console.log("Models loaded successfully");
        startVideo();
      } catch (err) {
        console.error("Error loading models: ", err);
      }
    };

    // Start video stream from webcam
    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Error accessing webcam: ", err));
    };

    // Detect emotions periodically
    const detectEmotions = async () => {
      let previousEmotion = null;

      const intervalId = setInterval(async () => {
        if (videoRef.current && !detectionStopped) {
          const detections = await faceapi
            .detectAllFaces(
              videoRef.current,
              new faceapi.TinyFaceDetectorOptions()
            )
            .withFaceExpressions();

          if (detections && detections.length > 0) {
            const expressions = detections[0].expressions;
            const emotionWithConfidence = Object.keys(expressions).reduce(
              (acc, key) => ({
                ...acc,
                [key]: (expressions[key] * 100).toFixed(2), // Convert to percentage
              }),
              {}
            );

            // Determine the most dominant emotion
            const highestEmotion = Object.keys(emotionWithConfidence).reduce(
              (maxEmotion, currentEmotion) =>
                emotionWithConfidence[currentEmotion] >
                emotionWithConfidence[maxEmotion]
                  ? currentEmotion
                  : maxEmotion
            );

            const currentEmotionPercentage =
              emotionWithConfidence[highestEmotion];

            // Update the displayed emotion based on the thresholds
            let updatedEmotionPercentage = currentEmotionPercentage;

            if (highestEmotion === "happy" && currentEmotionPercentage >= 60) {
              updatedEmotionPercentage = `Happy: ${currentEmotionPercentage}% (Above 60%)`;
            } else if (
              highestEmotion === "neutral" &&
              currentEmotionPercentage >= 40 &&
              currentEmotionPercentage <= 60
            ) {
              updatedEmotionPercentage = `Neutral: ${currentEmotionPercentage}% (Between 40% to 60%)`;
            } else if (
              highestEmotion === "sad" ||
              (highestEmotion === "angry" && currentEmotionPercentage < 40)
            ) {
              updatedEmotionPercentage = `Unhappy: ${currentEmotionPercentage}% (Below 40%)`;
            }

            if (previousEmotion !== highestEmotion) {
              setEmotionPercentage(updatedEmotionPercentage);
              previousEmotion = highestEmotion;
            }
          }
        }
      }, 1000);

      return () => clearInterval(intervalId); // Cleanup interval on unmount
    };

    // Stop YouTube video after 15 seconds and stop emotion detection
    const stopYouTubeVideo = () => {
      setTimeout(() => {
        if (iframeRef.current) {
          const iframeSrc = iframeRef.current.src;
          iframeRef.current.src = ""; // Stop the video by resetting src
          setTimeout(() => {
            if (iframeRef.current) {
              iframeRef.current.src = iframeSrc; // Reload the src after stopping
            }
          }, 1000);
          setVideoStopped(true);
          setDetectionStopped(true); // Stop emotion detection after video stops
        }
      }, 15000); // Video stops after 15 seconds
    };

    loadModels().then(() => {
      detectEmotions();
      stopYouTubeVideo();
    });

    // Cleanup on unmount
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [detectionStopped]);

  return (
    <div>
      <h1>Emotion Detector</h1>

      {/* Webcam feed */}
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{
          width: "400px",
          height: "300px",
          border: "1px solid black",
          marginBottom: "20px",
        }}
      ></video>

      {/* YouTube video */}
      {!videoStopped ? (
        <div style={{ marginTop: "20px" }}>
          <iframe
            ref={iframeRef}
            width="560"
            height="315"
            src="https://www.youtube.com/embed/hjlpAGs2piE?autoplay=1&mute=1"
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      ) : (
        <p>YouTube video has stopped after 15 seconds</p>
      )}

      {/* Emotion detection result */}
      {emotionPercentage ? (
        <div>
          <h2>Overall Emotion Percentage:</h2>
          <p>{emotionPercentage}</p>
        </div>
      ) : (
        <p>Waiting for emotion detection...</p>
      )}
    </div>
  );
};

export default EmotionDetector;
