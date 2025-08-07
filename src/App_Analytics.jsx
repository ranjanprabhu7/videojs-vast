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
      adsManagerLoadedTimeout: 8000,
      adTimeout: 8000,
      debug: false,
      locale: 'en',
      nonLinearAdSlotWidth: 640,
      nonLinearAdSlotHeight: 150,
      adsRenderingSettings: {
        restoreCustomPlaybackStateOnAdBreakComplete: true
      }
    }
  };

  const handlePlayerReady = (player) => {
    console.log('Player is ready', player);
    
    // ===== ANALYTICS TRACKING SETUP =====
    
    // Your analytics service (replace with your actual analytics platform)
    const sendAnalyticsEvent = (eventType, eventData) => {
      console.log(`📈 ANALYTICS: ${eventType}`, eventData);
      
      // Example integrations (uncomment the one you use):
      
      // Google Analytics 4
      // gtag('event', eventType, eventData);
      
      // Adobe Analytics
      // s.tl(true, 'o', eventType, eventData);
      
      // Custom Analytics API
      // fetch('/api/analytics', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ event: eventType, data: eventData })
      // });
      
      // Segment
      // analytics.track(eventType, eventData);
      
      // Mixpanel
      // mixpanel.track(eventType, eventData);
    };

    // ===== AD LIFECYCLE TRACKING =====
    
    player.on('ads-request', () => {
      sendAnalyticsEvent('ad_request', {
        timestamp: Date.now(),
        adTagUrl: videoJsOptions.ima.adTagUrl
      });
    });

    player.on('ads-load', () => {
      sendAnalyticsEvent('ad_loaded', {
        timestamp: Date.now()
      });
    });

    player.on('ads-start', () => {
      sendAnalyticsEvent('ad_break_start', {
        timestamp: Date.now(),
        adPosition: 'preroll' // or 'midroll', 'postroll' based on your logic
      });
    });

    player.on('ads-end', () => {
      sendAnalyticsEvent('ad_break_end', {
        timestamp: Date.now()
      });
    });

    player.on('ads-error', (error) => {
      sendAnalyticsEvent('ad_error', {
        timestamp: Date.now(),
        error: error.message || 'Unknown ad error'
      });
    });

    // ===== INDIVIDUAL AD TRACKING =====
    
    let adStartTime = null;
    let adDuration = null;
    let quartileFlags = { q25: false, q50: false, q75: false };

    player.on('ads-ad-started', () => {
      adStartTime = Date.now();
      adDuration = player.duration();
      quartileFlags = { q25: false, q50: false, q75: false };
      
      sendAnalyticsEvent('ad_start', {
        timestamp: adStartTime,
        duration: adDuration,
        currentTime: player.currentTime()
      });
    });

    player.on('ads-ad-ended', () => {
      sendAnalyticsEvent('ad_complete', {
        timestamp: Date.now(),
        duration: adDuration,
        watchTime: Date.now() - adStartTime
      });
      
      // Reset tracking
      adStartTime = null;
      adDuration = null;
      quartileFlags = { q25: false, q50: false, q75: false };
    });

    // ===== PROGRESS TRACKING (Manual Quartiles) =====
    
    player.on('timeupdate', () => {
      if (player.ads && player.ads.isInAdMode() && adStartTime && adDuration) {
        const currentTime = player.currentTime();
        const progress = (currentTime / adDuration) * 100;
        
        // Track quartiles
        if (progress >= 25 && !quartileFlags.q25) {
          quartileFlags.q25 = true;
          sendAnalyticsEvent('ad_quartile_25', {
            timestamp: Date.now(),
            progress: 25,
            currentTime: currentTime,
            duration: adDuration
          });
        }
        
        if (progress >= 50 && !quartileFlags.q50) {
          quartileFlags.q50 = true;
          sendAnalyticsEvent('ad_quartile_50', {
            timestamp: Date.now(),
            progress: 50,
            currentTime: currentTime,
            duration: adDuration
          });
        }
        
        if (progress >= 75 && !quartileFlags.q75) {
          quartileFlags.q75 = true;
          sendAnalyticsEvent('ad_quartile_75', {
            timestamp: Date.now(),
            progress: 75,
            currentTime: currentTime,
            duration: adDuration
          });
        }
      }
    });

    // ===== INTERACTION TRACKING =====
    
    player.on('pause', () => {
      if (player.ads && player.ads.isInAdMode()) {
        sendAnalyticsEvent('ad_pause', {
          timestamp: Date.now(),
          currentTime: player.currentTime()
        });
      }
    });

    player.on('play', () => {
      if (player.ads && player.ads.isInAdMode()) {
        sendAnalyticsEvent('ad_resume', {
          timestamp: Date.now(),
          currentTime: player.currentTime()
        });
      }
    });

    player.on('volumechange', () => {
      if (player.ads && player.ads.isInAdMode()) {
        const isMuted = player.muted();
        sendAnalyticsEvent(isMuted ? 'ad_mute' : 'ad_unmute', {
          timestamp: Date.now(),
          volume: player.volume(),
          muted: isMuted
        });
      }
    });

    player.on('fullscreenchange', () => {
      if (player.ads && player.ads.isInAdMode()) {
        const isFullscreen = player.isFullscreen();
        sendAnalyticsEvent(isFullscreen ? 'ad_fullscreen_enter' : 'ad_fullscreen_exit', {
          timestamp: Date.now(),
          fullscreen: isFullscreen
        });
      }
    });
  };

  return (
    <>
      <h1>Video.js + IMA Ads - Analytics Tracking</h1>
      
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '2rem' }}>
        <VideoPlayer options={videoJsOptions} onReady={handlePlayerReady} />
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>📈 Ad Analytics Tracking</h3>
        <p>Check console for analytics events being sent. Replace the <code>sendAnalyticsEvent</code> function with your analytics platform!</p>
        
        <h4>Events Being Tracked:</h4>
        <ul>
          <li><strong>Ad Lifecycle:</strong> request, loaded, break_start, break_end, error</li>
          <li><strong>Ad Progress:</strong> start, quartile_25, quartile_50, quartile_75, complete</li>
          <li><strong>User Interactions:</strong> pause, resume, mute, unmute, fullscreen</li>
        </ul>
      </div>
    </>
  )
}

export default App
