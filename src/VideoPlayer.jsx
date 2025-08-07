import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

// Import contrib-ads first, then IMA
import 'videojs-contrib-ads';
import 'videojs-ima';

const VideoPlayer = ({ options, onReady }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      const videoElement = document.createElement("video-js");
      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, options);

      // Initialize contrib-ads plugin first
    //   player.ads({
    //     debug: true,
    //     timeout: 8000
    //   });
      
      // Initialize IMA plugin immediately after ads plugin
      // This must happen before the player is ready
      if (options.ima) {
        player.ima(options.ima);
      }
      
      // Wait for player to be ready
      player.ready(() => {
        console.log('Player is ready...');
        if (onReady) {
          onReady(player);
        }
      });
    }
    
    // Cleanup function
    return () => {
      const player = playerRef.current;
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [options, onReady]);

  return (
    <div data-vjs-player>
      <div ref={videoRef} />
    </div>
  );
};

export default VideoPlayer;