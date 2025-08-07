import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import VideoPlayer from './VideoPlayer'

function App() {
  const [count, setCount] = useState(0)

  const videoJsOptions = {
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    sources: [{
      src: 'https://vjs.zencdn.net/v/oceans.mp4',
      type: 'video/mp4'
    }],
    // IMA SDK configuration
    ima: {
      adTagUrl: 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
      // More reliable IMA settings
      adsManagerLoadedTimeout: 8000,  // Increased timeout
      adTimeout: 8000,                // Add ad timeout
      adsManagerLoadedCallback: () => {
        console.log('IMA ads manager loaded');
      },
      debug: false, // Disable IMA debug to reduce noise
      locale: 'en',
      nonLinearAdSlotWidth: 640,
      nonLinearAdSlotHeight: 150,
      // Add error handling
      adsRenderingSettings: {
        restoreCustomPlaybackStateOnAdBreakComplete: true
      }
    }
  };

  const handlePlayerReady = (player) => {
    console.log('Player is ready', player);
    
    // ===== ARCHITECTURE EXPLANATION =====
    console.log(`
    📚 AD SYSTEM ARCHITECTURE:
    
    1️⃣ VIDEO.JS PLAYER - Base video player
    2️⃣ VIDEOJS-CONTRIB-ADS - Ad framework (provides ad lifecycle management)
    3️⃣ VIDEOJS-IMA - IMA SDK bridge (connects Google IMA to contrib-ads)
    4️⃣ GOOGLE IMA SDK - Handles VAST parsing and ad serving
    5️⃣ VAST XML - Contains ad metadata and tracking URLs
    
    EVENT FLOW:
    VAST Server → IMA SDK → videojs-ima → contrib-ads → Video.js → Your Code
    
    🔍 TO SEE VAST TRACKING CALLS:
    1. Open Dev Tools (F12)
    2. Go to Network tab
    3. Filter by "pubads.g.doubleclick.net"
    4. Play the video and watch for tracking calls!
    `);

    // ===== NETWORK MONITORING =====
    // Override fetch to monitor VAST tracking calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && url.includes('pubads.g.doubleclick.net')) {
        // Extract the label parameter to see what event is being tracked
        const urlObj = new URL(url);
        const label = urlObj.searchParams.get('label');
        console.log(`🌐 VAST TRACKING CALL: ${label || 'unknown'}`, url);
      }
      return originalFetch.apply(this, args);
    };

    // Also monitor XMLHttpRequest for older tracking methods
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      if (typeof url === 'string' && url.includes('pubads.g.doubleclick.net')) {
        const urlObj = new URL(url);
        const label = urlObj.searchParams.get('label');
        console.log(`🌐 VAST XHR CALL: ${label || 'unknown'}`, url);
      }
      return originalOpen.call(this, method, url, ...args);
    };

    // ===== LAYER 1: CONTRIB-ADS FRAMEWORK EVENTS =====
    // These are the HIGH-LEVEL ad lifecycle events from videojs-contrib-ads
    console.log('🔧 Setting up CONTRIB-ADS framework events...');
    
    player.on('ads-request', () => {
      console.log('📞 CONTRIB-ADS: Ad request sent to ad server');
    });

    player.on('ads-load', () => {
      console.log('📦 CONTRIB-ADS: Ad response received and loaded');
    });

    player.on('ads-start', () => {
      console.log('� CONTRIB-ADS: Entering ad mode (content paused)');
    });

    player.on('ads-end', () => {
      console.log('✅ CONTRIB-ADS: Exiting ad mode (content resumed)');
    });

    player.on('ads-error', (error) => {
      console.log('❌ CONTRIB-ADS: Ad error occurred', error);
    });

    // ===== LAYER 2: IMA PLUGIN EVENTS =====
    // These are from videojs-ima plugin (bridge between IMA SDK and contrib-ads)
    console.log('� Setting up IMA plugin events...');
    
    player.on('ads-ad-started', () => {
      console.log('▶️ IMA PLUGIN: Individual ad video started');
    });

    player.on('ads-ad-ended', () => {
      console.log('⏹️ IMA PLUGIN: Individual ad video ended');
    });

    // ===== LAYER 3: VAST TRACKING EVENTS =====
    // These SHOULD fire when VAST tracking pixels are triggered
    console.log('🔧 Setting up VAST tracking events...');
    
    // Standard VAST progress events
    player.on('ads-first-quartile', () => {
      console.log('📊 VAST TRACKING: 25% complete');
    });

    player.on('ads-midpoint', () => {
      console.log('📊 VAST TRACKING: 50% complete'); 
    });

    player.on('ads-third-quartile', () => {
      console.log('📊 VAST TRACKING: 75% complete');
    });

    player.on('ads-complete', () => {
      console.log('📊 VAST TRACKING: 100% complete');
    });

    // ===== DEBUGGING: What's actually happening? =====
    console.log('� Setting up debug monitoring...');
    
    // Monitor ad state changes
    player.on('ads-ad-started', () => {
      console.log('� DEBUG: Ad started - checking available methods...');
      
      // Check what's available on the player
      console.log('Player.ima available:', !!player.ima);
      console.log('Player.ads available:', !!player.ads);
      
      if (player.ima) {
        console.log('IMA methods:', Object.getOwnPropertyNames(player.ima));
      }
      
      // Try to access current ad info
      setTimeout(() => {
        console.log('� DEBUG: Ad playing state after 1s:', {
          currentTime: player.currentTime(),
          duration: player.duration(),
          isInAdMode: player.ads ? player.ads.isInAdMode() : 'unknown'
        });
      }, 1000);
    });

    // Monitor for timeupdate during ads to see if we can calculate progress manually
    let adStartTime = null;
    let adDuration = null;
    
    player.on('ads-ad-started', () => {
      adStartTime = Date.now();
      adDuration = player.duration();
      console.log('� MANUAL TRACKING: Ad started, duration:', adDuration);
    });

    player.on('timeupdate', () => {
      if (player.ads && player.ads.isInAdMode() && adStartTime && adDuration) {
        const currentTime = player.currentTime();
        const progress = (currentTime / adDuration) * 100;
        
        // Log quartiles manually if VAST events don't fire
        if (progress >= 25 && !player._quartile25) {
          console.log('📊 MANUAL TRACKING: 25% quartile reached');
          player._quartile25 = true;
        }
        if (progress >= 50 && !player._quartile50) {
          console.log('� MANUAL TRACKING: 50% quartile reached');
          player._quartile50 = true;
        }
        if (progress >= 75 && !player._quartile75) {
          console.log('📊 MANUAL TRACKING: 75% quartile reached');
          player._quartile75 = true;
        }
      }
    });

    player.on('ads-ad-ended', () => {
      // Reset tracking flags
      player._quartile25 = false;
      player._quartile50 = false;
      player._quartile75 = false;
      adStartTime = null;
      adDuration = null;
    });
  };

  return (
    <>
      <h1>Vite + React + Video.js + IMA Ads (VAST Event Tracking)</h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
        <VideoPlayer options={videoJsOptions} onReady={handlePlayerReady} />
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>Check Console for VAST Ad Events</h3>
        <p>Open browser dev tools (F12) and check the console for real-time ad event tracking with emojis! 🎬📊</p>
      </div>
    </>
  )
}

export default App
