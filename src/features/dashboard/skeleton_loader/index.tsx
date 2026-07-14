import { Box, Skeleton } from '@mui/material';

const DashboardSkeletonLoader = () => {
  return (
    <Box sx={{ width: '100%', maxWidth: '600px', margin: '0 auto', paddingTop: '16px' }}>
      {/* GREETING SKELETON */}
      <div className="hello-greeting" style={{ animation: 'none' }}>
        <Skeleton variant="text" width="60%" height={40} sx={{ borderRadius: 'var(--radius-l)' }} />
        <Skeleton variant="text" width="40%" height={24} sx={{ borderRadius: 'var(--radius-m)', marginTop: '6px' }} />
      </div>

      {/* MY ASSIGNMENTS SHORTCUT SKELETON */}
      <div className="assign-card" style={{ cursor: 'default', animation: 'none' }}>
        <div className="ic">
          <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 'var(--radius-m)', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
        </div>
        <div className="txt">
          <Skeleton variant="text" width="30%" height={16} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
          <Skeleton variant="text" width="70%" height={24} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', marginTop: '4px' }} />
        </div>
        <Skeleton variant="text" width={24} height={34} sx={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', marginRight: '2px' }} />
      </div>

      {/* PROGRAM SECTION SKELETON */}
      <div className="section-label">
        <Skeleton variant="text" width="80px" height={16} />
      </div>
      <div className="week-card" style={{ animation: 'none' }}>
        <div className="week-head-section">
          <Skeleton variant="text" width="100px" height={28} />
          <Skeleton variant="rectangular" width="120px" height={28} sx={{ borderRadius: 'var(--radius-max)' }} />
        </div>
        
        {/* Row 1 */}
        <div className="meeting-row" style={{ cursor: 'default' }}>
          <Skeleton variant="rectangular" width={54} height={58} sx={{ borderRadius: '15px' }} />
          <div className="meeting-info">
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="60%" height={16} sx={{ marginTop: '4px' }} />
          </div>
          <Skeleton variant="rectangular" width={50} height={28} sx={{ borderRadius: '10px' }} />
        </div>

        {/* Row 2 */}
        <div className="meeting-row" style={{ cursor: 'default' }}>
          <Skeleton variant="rectangular" width={54} height={58} sx={{ borderRadius: '15px' }} />
          <div className="meeting-info">
            <Skeleton variant="text" width="50%" height={20} />
            <Skeleton variant="text" width="45%" height={16} sx={{ marginTop: '4px' }} />
          </div>
          <Skeleton variant="rectangular" width={50} height={28} sx={{ borderRadius: '10px' }} />
        </div>

        <div style={{ margin: '6px' }}>
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: '17px' }} />
        </div>
      </div>

      {/* EXPLORE MENU GRID SKELETON */}
      <div className="section-label">
        <Skeleton variant="text" width="80px" height={16} />
      </div>
      <div className="tile-grid">
        {/* Tile 1 */}
        <div className="tile-item c-blue" style={{ cursor: 'default', animation: 'none' }}>
          <div className="ti">
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 'var(--radius-m)' }} />
          </div>
          <div>
            <Skeleton variant="text" width="50%" height={18} />
            <Skeleton variant="text" width="80%" height={14} sx={{ marginTop: '4px' }} />
          </div>
        </div>

        {/* Tile 2 */}
        <div className="tile-item c-blue" style={{ cursor: 'default', animation: 'none' }}>
          <div className="ti">
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 'var(--radius-m)' }} />
          </div>
          <div>
            <Skeleton variant="text" width="60%" height={18} />
            <Skeleton variant="text" width="70%" height={14} sx={{ marginTop: '4px' }} />
          </div>
        </div>

        {/* Tile 3 */}
        <div className="tile-item c-blue" style={{ cursor: 'default', animation: 'none' }}>
          <div className="ti">
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 'var(--radius-m)' }} />
          </div>
          <div>
            <Skeleton variant="text" width="40%" height={18} />
            <Skeleton variant="text" width="75%" height={14} sx={{ marginTop: '4px' }} />
          </div>
        </div>

        {/* Tile 4 */}
        <div className="tile-item c-blue" style={{ cursor: 'default', animation: 'none' }}>
          <div className="ti">
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 'var(--radius-m)' }} />
          </div>
          <div>
            <Skeleton variant="text" width="55%" height={18} />
            <Skeleton variant="text" width="85%" height={14} sx={{ marginTop: '4px' }} />
          </div>
        </div>

        {/* Tile 5 (Full width) */}
        <div className="tile-item c-blue full-width" style={{ cursor: 'default', animation: 'none' }}>
          <div className="ti">
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 'var(--radius-m)' }} />
          </div>
          <div className="tile-body">
            <Skeleton variant="text" width="30%" height={18} />
            <Skeleton variant="text" width="50%" height={14} sx={{ marginTop: '4px' }} />
          </div>
        </div>

        {/* Tile 6 (Full width) */}
        <div className="tile-item c-blue full-width" style={{ cursor: 'default', animation: 'none' }}>
          <div className="ti">
            <Skeleton variant="rectangular" width={24} height={24} sx={{ borderRadius: 'var(--radius-m)' }} />
          </div>
          <div className="tile-body">
            <Skeleton variant="text" width="25%" height={18} />
            <Skeleton variant="text" width="45%" height={14} sx={{ marginTop: '4px' }} />
          </div>
        </div>
      </div>
    </Box>
  );
};

export default DashboardSkeletonLoader;
