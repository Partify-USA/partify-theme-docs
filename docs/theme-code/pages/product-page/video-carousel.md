---
sidebar_position: 2
---

# Product Video Carousel

The product video carousel is rendered by `sections/product-video-carousel.liquid`.
It has **two video sources**, and they are mutually exclusive:

1. **Product metafield (primary).** If the product has the metafield
   `custom.product_video_bubbles` set, the section reads its clips and ignores
   the section settings entirely.
2. **Section settings (fallback).** Only when that metafield is **absent** does
   the section fall back to the `video_1…video_7` settings configured on the
   section in the theme editor.

In practice, videos are managed through the metafield/metaobject path. The
section settings exist as a per-page fallback.

## Preparing a video

1. Compress the video with HandBrake to minimize file size.
2. Upload it to Shopify **Content → Files**.
3. Copy the CDN URL.

## Primary path: the Product Videos metaobject

The `custom.product_video_bubbles` metafield is backed by the **Product Videos**
metaobject (note: _Product Videos_, not _Product Videos Carousel_). The section
loops `clip1` through `clip7`, pairing each clip URL with its label:

- `clip<number>` — the Shopify CDN video URL (type: **One URL**)
- `clip<number>_label` — the caption shown under the video (type: **One single line text**)

The Liquid derives the keys like this (so `clip1`, `clip2`, … and their
`_label` counterparts):

```liquid
{% for i in (1..7) %}
  {% assign clip_key = 'clip' | append: i %}
  {% assign clip_key_label = clip_key | append: '_label' %}
  ...
{% endfor %}
```

**To add a video for a product:**

1. Open the **Product Videos** metaobject and find (or create) the entry linked
   to that product via `custom.product_video_bubbles`.
2. Set the next available `clip<number>` to the CDN URL and `clip<number>_label`
   to the caption.
3. If you need more than the current number of clip fields, click **Manage
   definition** on the metaobject and add the next `clip<number>` /
   `clip<number>_label` pair, then bump the `(1..7)` loop in
   `product-video-carousel.liquid` to match.

The rendered item structure (same for both sources) is:

```liquid
<div class="carousel-video-item" data-video="{{ clip_url }}">
  <video muted playsinline loop preload="metadata">
    <source src="{{ clip_url }}" type="video/mp4">
  </video>
  <div class="video-title">{{ clip_label }}</div>
</div>
```

## Fallback path: section settings

If a product has **no** `custom.product_video_bubbles` metafield, the section
renders the `video_1…video_7` / `video_1_title…video_7_title` settings instead.
These are defined in the `{% schema %}` block at the bottom of
`sections/product-video-carousel.liquid`:

```json
{
  "type": "text",
  "id": "video_X",
  "label": "Video X URL",
  "info": "Enter the Shopify CDN video URL"
},
{
  "type": "text",
  "id": "video_X_title",
  "label": "Video X Title",
  "info": "Text displayed at the bottom of video X"
}
```

Set these from the theme editor on the product template. Remember: any product
that has the metafield set will ignore these settings.

## Owner & Maintenance

- **Owner:** Frontend Team
- **Last Updated:** June 19, 2026
