declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string
    color?: string
  }
  export type Icon = FC<IconProps>
  export const Plus: Icon
  export const Edit2: Icon
  export const Trash2: Icon
  export const Volume2: Icon
  export const VolumeX: Icon
  export const Pause: Icon
  export const Play: Icon
  export const Sun: Icon
  export const Moon: Icon
} 