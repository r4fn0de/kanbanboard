import type { ImgHTMLAttributes } from 'react'

import type {
  SlateElementProps,
  TCaptionProps,
  TImageElement,
  TResizableProps,
} from 'platejs'

import { NodeApi, SlateElement } from 'platejs'

import { cn } from '@/lib/utils'

export function ImageElementStatic(
  props: SlateElementProps<TImageElement & TCaptionProps & TResizableProps>
) {
  const { align = 'center', caption, url, width } = props.element
  const firstCaptionNode = caption?.[0]
  const alt = (
    props.attributes as ImgHTMLAttributes<HTMLImageElement> | undefined
  )?.alt

  return (
    <SlateElement {...props} className="py-2.5">
      <figure className="group relative m-0 inline-block" style={{ width }}>
        <div
          className="relative max-w-full min-w-[92px]"
          style={{ textAlign: align }}
        >
          <img
            className={cn(
              'w-full max-w-full cursor-default object-cover px-0',
              'rounded-sm'
            )}
            alt={alt}
            src={url}
          />
          {firstCaptionNode && (
            <figcaption className="mx-auto mt-2 h-[24px] max-w-full">
              {NodeApi.string(firstCaptionNode)}
            </figcaption>
          )}
        </div>
      </figure>
      {props.children}
    </SlateElement>
  )
}
