import CircularProgress from '@mui/material/CircularProgress';

type LoadingTextProps = {
  text?: string | null;
  style?: React.CSSProperties; // Added style prop
};

const LoadingText: React.FC<LoadingTextProps> = ({ text, style }) => (
  <div style={{ display: 'flex', alignItems: 'center', minHeight: 24, ...style }}>
    {!text ? (
      <>
        <CircularProgress size={18} style={{ marginRight: 8 }} />
        <span>Loading...</span>
      </>
    ) : (
      <span>{text}</span>
    )}
  </div>
);

export default LoadingText;