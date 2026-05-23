import { useEffect } from 'react';
import { Box, IconButton } from '@mui/material';
import { IconEllipse } from '@icons/index';
import { SlideItem } from './index.styles';
import useIllustration from './useIllustration';
import Typography from '@components/typography';

const StartupIllustration = () => {
  const {
    currentImage,
    setCurrentImage,
    dotSize,
    handleSlide,
    slides,
  } = useIllustration();

  // Autoplay slide rotation every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [slides.length, setCurrentImage]);

  return (
    <Box
      sx={{
        flex: 1,
        background: 'var(--accent-main)',
        borderRadius: 'var(--radius-xxl)',
        padding: { mobile: '24px 0px', laptop: '48px 0px' },
        minWidth: '0px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '32px',
      }}
    >
      <Box
        sx={{
          flex: '1 0 0',
          overflow: 'hidden',
          width: '100%',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            width: `${slides.length * 100}%`,
            height: '100%',
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: `translateX(-${(currentImage * 100) / slides.length}%)`,
          }}
        >
          {slides.map((slide) => (
            <Box
              key={slide.title}
              sx={{
                width: `${100 / slides.length}%`,
                height: '100%',
                flexShrink: 0,
              }}
            >
              <SlideItem>
                <Box>
                  <Typography
                    className="h1"
                    color="var(--always-white)"
                    sx={{ marginBottom: '24px' }}
                  >
                    {slide.title}
                  </Typography>
                  <Typography
                    className="body-regular"
                    color="var(--always-white)"
                  >
                    {slide.desc}
                  </Typography>
                </Box>
                {slide.component}
              </SlideItem>
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { mobile: '12px', laptop: '16px' },
        }}
      >
        {slides.map((item, index) => (
          <IconButton
            key={item.title}
            disableRipple
            sx={{
              opacity: currentImage === index ? 1 : 0.48,
              padding: 0,
              margin: 0,
              width: { mobile: '12px', laptop: '16px' },
            }}
            onClick={() => handleSlide(index)}
          >
            <IconEllipse
              color="var(--always-white)"
              width={currentImage === index ? dotSize.active : dotSize.inactive}
              height={
                currentImage === index ? dotSize.active : dotSize.inactive
              }
            />
          </IconButton>
        ))}
      </Box>
    </Box>
  );
};

export default StartupIllustration;
