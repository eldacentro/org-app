const LottieLoader = ({ size = 72 }: { size?: number }) => {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src="/img/icon/isotipo.svg"
        alt="Elda Centro"
        style={{
          width: size,
          height: size,
          animation: 'eldaPulse 1.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes eldaPulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.88); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LottieLoader;
