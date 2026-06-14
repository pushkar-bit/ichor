declare module '*.css';

import 'lucide-react-native';
declare module 'lucide-react-native' {
  export interface LucideProps {
    color?: string | import('react-native').ColorValue;
  }
}
