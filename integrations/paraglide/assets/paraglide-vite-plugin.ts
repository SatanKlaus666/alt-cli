import { paraglide } from '@inlang/paraglide-vite'

export default function () {
  return paraglide({
    project: './project.inlang',
    outdir: './src/paraglide',
  })
}
