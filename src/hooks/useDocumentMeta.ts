import { useEffect } from 'react';

interface DocumentMetaOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export function useDocumentMeta(options: DocumentMetaOptions) {
  useEffect(() => {
    // Store original values to restore on unmount
    const originalTitle = document.title;
    const originalDescription = document.querySelector('meta[name="description"]')?.getAttribute('content');
    const originalOgTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const originalOgDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
    const originalOgImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');

    // Update title
    if (options.title) {
      document.title = options.title;
    }

    // Update meta description
    if (options.description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', options.description);
      } else {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        metaDesc.setAttribute('content', options.description);
        document.head.appendChild(metaDesc);
      }
    }

    // Update og:title
    if (options.ogTitle) {
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', options.ogTitle);
      } else {
        ogTitle = document.createElement('meta');
        ogTitle.setAttribute('property', 'og:title');
        ogTitle.setAttribute('content', options.ogTitle);
        document.head.appendChild(ogTitle);
      }
    }

    // Update og:description
    if (options.ogDescription) {
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute('content', options.ogDescription);
      } else {
        ogDesc = document.createElement('meta');
        ogDesc.setAttribute('property', 'og:description');
        ogDesc.setAttribute('content', options.ogDescription);
        document.head.appendChild(ogDesc);
      }
    }

    // Update og:image
    if (options.ogImage) {
      let ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute('content', options.ogImage);
      } else {
        ogImage = document.createElement('meta');
        ogImage.setAttribute('property', 'og:image');
        ogImage.setAttribute('content', options.ogImage);
        document.head.appendChild(ogImage);
      }

      // Also update twitter:image
      let twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        twitterImage.setAttribute('content', options.ogImage);
      }
    }

    // Cleanup: restore original values on unmount
    return () => {
      document.title = originalTitle;
      
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && originalDescription) {
        metaDesc.setAttribute('content', originalDescription);
      }
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && originalOgTitle) {
        ogTitle.setAttribute('content', originalOgTitle);
      }
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc && originalOgDescription) {
        ogDesc.setAttribute('content', originalOgDescription);
      }
      
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && originalOgImage) {
        ogImage.setAttribute('content', originalOgImage);
      }
      
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage && originalOgImage) {
        twitterImage.setAttribute('content', originalOgImage);
      }
    };
  }, [options.title, options.description, options.ogTitle, options.ogDescription, options.ogImage]);
}
