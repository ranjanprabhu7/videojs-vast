import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import VideoPlayer from "./VideoPlayer";

function App() {
  const [count, setCount] = useState(0);

  const videoJsOptions = {
    autoplay: true,
    controls: true,
    responsive: true,
    fluid: true,
    sources: [
      {
        src: "https://vjs.zencdn.net/v/oceans.mp4",
        type: "video/mp4",
      },
    ],
    // IMA SDK configuration
    ima: {
      adTagUrl:
        "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=",
      adsManagerLoadedTimeout: 8000,
      adTimeout: 8000,
      debug: false,
      locale: "en",
      nonLinearAdSlotWidth: 640,
      nonLinearAdSlotHeight: 150,
      adsRenderingSettings: {
        restoreCustomPlaybackStateOnAdBreakComplete: true,
      },
    },
  };

  const handlePlayerReady = (player) => {
    console.log("Player is ready", player);
    
    // ===== ANALYTICS TRACKING SETUP =====
    const sendAnalyticsEvent = (eventType, eventData) => {
      console.log(`📈 ANALYTICS: ${eventType}`, eventData);
      
      const webhookUrl = 'https://webhook.site/ed0444b8-6aef-4280-844b-87bbb5085a85';
      
      const payload = {
        event_type: eventType,
        event_data: eventData,
        video_player: 'videojs_ima',
        timestamp_iso: new Date().toISOString(),
        session_id: Date.now(),
        user_agent: navigator.userAgent
      };
      
      // Method 1: Try direct fetch first (might work from some environments)
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })
      .then(response => {
        if (response.ok) {
          console.log(`✅ Direct webhook sent: ${eventType}`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      })
      .catch(error => {
        console.log(`📝 Direct fetch failed, using pixel tracking: ${error.message}`);
        
        // Method 2: Image pixel tracking (always works, no CORS)
        const img = new Image();
        const queryParams = new URLSearchParams({
          event: eventType,
          data: JSON.stringify(eventData),
          timestamp: new Date().toISOString(),
          session: Date.now(),
          source: 'pixel_tracking'
        });
        
        img.src = `${webhookUrl}?${queryParams.toString()}`;
        
        img.onload = () => {
          console.log(`✅ Pixel tracking sent: ${eventType}`);
        };
        
        img.onerror = () => {
          console.log(`❌ Pixel tracking failed: ${eventType}`);
          // Final fallback: just log locally
          console.log(`📝 LOCAL LOG: ${eventType}`, payload);
        };
        
        // Clean up
        setTimeout(() => {
          img.src = '';
        }, 1000);
      });
    };
    
    // Track if IMA listeners are already registered to prevent duplicates
    let imaListenersRegistered = false;
    
    // ===== IMA SDK DIRECT ACCESS =====
    // Register IMA listeners as early as possible
    const registerIMAListeners = () => {
      if (imaListenersRegistered) return; // Prevent duplicates
      
      const adsManager = player.ima?.getAdsManager?.();
      console.log("Attempting to register IMA listeners, adsManager:", adsManager);
      
      if (adsManager && window.google?.ima?.AdEvent) {
        const AdEvent = window.google.ima.AdEvent;
        
        // Register all IMA SDK events
        adsManager.addEventListener(AdEvent.Type.STARTED, (e) => {
          console.log("🎯 IMA Started Event fired");
          sendAnalyticsEvent('ad_start', {
            timestamp: Date.now(),
            source: 'ima_sdk'
          });
        });
        
        adsManager.addEventListener(AdEvent.Type.IMPRESSION, (e) => {
          console.log("🎯 IMA Impression Event fired");
          sendAnalyticsEvent('ad_impression', {
            timestamp: Date.now(),
            source: 'ima_sdk'
          });
        });
        
        adsManager.addEventListener(AdEvent.Type.FIRST_QUARTILE, (e) => {
          console.log("🎯 IMA First Quartile Event fired");
          sendAnalyticsEvent('ad_quartile_25', {
            timestamp: Date.now(),
            source: 'ima_sdk'
          });
        });
        
        adsManager.addEventListener(AdEvent.Type.MIDPOINT, (e) => {
          console.log("🎯 IMA Midpoint Event fired");
          sendAnalyticsEvent('ad_quartile_50', {
            timestamp: Date.now(),
            source: 'ima_sdk'
          });
        });
        
        adsManager.addEventListener(AdEvent.Type.THIRD_QUARTILE, (e) => {
          console.log("🎯 IMA Third Quartile Event fired");
          sendAnalyticsEvent('ad_quartile_75', {
            timestamp: Date.now(),
            source: 'ima_sdk'
          });
        });
        
        adsManager.addEventListener(AdEvent.Type.COMPLETE, (e) => {
          console.log("🎯 IMA Complete Event fired");
          sendAnalyticsEvent('ad_complete', {
            timestamp: Date.now(),
            source: 'ima_sdk'
          });
        });
        
        adsManager.addEventListener(AdEvent.Type.CLICK, (e) => {
          console.log("🎯 IMA Click Event fired");
          sendAnalyticsEvent('ad_click', {
            timestamp: Date.now(),
            source: 'ima_sdk'
          });
        });
        
        imaListenersRegistered = true;
        console.log("✅ IMA SDK event listeners registered successfully!");
        return true;
      } else {
        console.log("❌ IMA SDK not available or adsManager null");
        return false;
      }
    };
    
    // Try to register IMA listeners at different points
    // Option 1: Try immediately when player is ready
    registerIMAListeners();
    
    // Option 2: Try when ads are ready
    player.on('adsready', () => {
      console.log("adsready event fired");
      registerIMAListeners();
    });
    
    // Option 3: Try when first ad starts (fallback)
    player.on("ads-ad-started", () => {
      console.log("ads-ad-started event fired");
      registerIMAListeners();
    });
    
    // ===== BASIC VIDEO.JS EVENTS (Always reliable) =====
    player.on('adstart', () => {
      sendAnalyticsEvent('ad_break_start', {
        timestamp: Date.now(),
        adPosition: 'preroll'
      });
    });

    player.on('adend', () => {
      sendAnalyticsEvent('ad_break_end', {
        timestamp: Date.now()
      });
    });
    
    // ===== HYBRID APPROACH (Fallback to Video.js events) =====
    // Use Video.js events as fallback if IMA events don't fire
    player.on("ads-ad-started", () => {
      if (!imaListenersRegistered) {
        console.log("📝 Using Video.js events as fallback");
        sendAnalyticsEvent('ad_start_fallback', {
          timestamp: Date.now(),
          duration: player.duration(),
          source: 'videojs_fallback'
        });
      }
    });
  };

  return (
    <>
      <h1>Video.js + IMA Ads - Analytics Tracking</h1>

      <div
        style={{ maxWidth: "800px", margin: "0 auto", marginBottom: "2rem" }}
      >
        <VideoPlayer options={videoJsOptions} onReady={handlePlayerReady} />
      </div>
    </>
  );
}

export default App;
