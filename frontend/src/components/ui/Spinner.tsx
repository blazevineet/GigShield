
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?:       'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export default function Spinner({ size = 'md', fullScreen }: SpinnerProps) {
  const el = <div className={`${styles.spinner} ${styles[size]}`} aria-label="Loading" />;
  if (fullScreen) {
    return (
      <div className={styles.fullScreen}>
        <div className={styles.brand}>🛵</div>
        {el}
      </div>
    );
  }
  return el;
}
