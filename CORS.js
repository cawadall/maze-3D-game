(function() {

function isSameOrigin(url) {
  return (new URL(url, window.location.href)).origin === window.location.origin;
}

function needsCORS(url) {
  // not sure all the URLs that should be checked for
  return !isSameOrigin(url) && !url.startsWith("blob:") && !url.startsWith("data:");
}

const srcSetFn = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src').set; 

Object.defineProperty(HTMLImageElement.prototype, 'src', {
  enumerable: true,
  set: function(url) {
     if (needsCORS(url)) {
       // Set if not already set
       if (this.crossOrigin !== undefined) {
         this.crossOrigin = '';
       }
     } else {
       this.crossOrigin = undefined;
     }
     // Set the original attribute
     srcSetFn.call(this, url);
  },
});

}());
