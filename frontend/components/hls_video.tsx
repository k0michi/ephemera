import Hls, { type HlsConfig } from 'hls.js';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface HlsVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  hlsConfig?: Partial<HlsConfig>;
}

const HlsVideo = forwardRef<HTMLVideoElement, HlsVideoProps>(
  ({ src, hlsConfig, ...props }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

    useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      if (Hls.isSupported()) {
        const hls = new Hls({
          ...hlsConfig,
          capLevelToPlayerSize: true,
          enableWorker: true,
        });

        hlsRef.current = hls;
        hls.loadSource(src);
        hls.attachMedia(video);

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src;
      }

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    }, [src, hlsConfig]);

    return (
      <video
        ref={videoRef}
        {...props}
        playsInline
      />
    );
  }
);

HlsVideo.displayName = 'HlsVideo';

export default HlsVideo;
