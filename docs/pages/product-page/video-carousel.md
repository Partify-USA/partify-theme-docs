---
sidebar_position: 2
---

# Product Video Carousel

## Adding Videos

Videos can be added in two locations:

### 1. Product.json & product-video-carousel.liquid

**Prepare the video:**

1. Compress video with HandBrake to minimize file size
2. Upload to Shopify Content → Files
3. Copy the CDN URL

**Add to product.json:**

- Navigate to `templates/product.json`
- Under `product_video_carousel_section` settings, add new video URL and title

**Add to schema:**

- Open `sections/product-video-carousel.liquid`
- In the `{% schema %}` section at the bottom, add two new fields:

```json
{
  "type": "text",
  "id": "video_X",
  "label": "Video X URL",
  "info": "Enter the Shopify CDN video URL",
  "default": "https://cdn.shopify.com/videos/..."
},
{
  "type": "text",
  "id": "video_X_title",
  "label": "Video X Title",
  "info": "Text displayed at the bottom of video X"
}
```

Replace `X` with the next video number (1-howver many).

**Add to liquid template:**

- In the same file, find the `{% else %}` block (around line 290)
- Add the new video block before `{% endif %}`:

```liquid
{% if section.settings.video_X != blank %}
  <div class="carousel-video-item" data-video="{{ section.settings.video_X }}">
    <video muted playsinline loop preload="metadata">
      <source src="{{ section.settings.video_X }}" type="video/mp4">
    </video>
    {% if section.settings.video_X_title != blank %}
      <div class="video-title">{{ section.settings.video_X_title }}</div>
    {% endif %}
  </div>
{% endif %}
```

**Update for loop:**

- Find `{% for i in (1..6) %}` (around line 274)
- Increment the range to match total videos: `{% for i in (1..7) %}`

### 2. Product Videos Metaobject

**Update definition:**

1. Navigate to Product Videos metaobject (Not Product Videos Carousel)
2. Click "Manage definition" at top
3. Add two new fields:
   - `video_<number>` - Type: **One URL**
   - `video_<number>_label` - Type: **One single line text**

**Update entries:**

1. Go to Front Bumper Set entry (and other entries if they exist)
2. Add the same title and URL used in product.json

Once both locations are updated, the videos will appear in the carousel.
