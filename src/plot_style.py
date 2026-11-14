"""Scientific plotting colors used throughout the project."""
import numpy as np
from matplotlib.colors import ListedColormap
FIELD = '#b83a24'
ENERGY = '#315646'
MEAN = '#204b6e'
MOMENT = '#8c2d19'
RMS = '#204b6e'
MAX_ERROR = '#8c2d19'
RAW = '#204b6e'
HARDENED = '#8c2d19'
REFERENCE = '#666666'
# Reproduce the browser canvas RGB interpolation, including rounding.
_v = np.linspace(-1, 1, 65537)
_a = np.array([43, 92, 143]); _b = np.array([184, 58, 36])
_rgb = np.where((_v < 0)[:, None], _a + (_v+1)[:,None]*(255-_a), 255 + _v[:,None]*(_b-255))
FIELD_CMAP = ListedColormap(np.floor(_rgb+0.5)/255, name='tdgl_field')
def time_color(t):
    """Stable legend colors for overlays of multiple observation times."""
    from matplotlib.colors import LinearSegmentedColormap
    cm = LinearSegmentedColormap.from_list('tdgl_times', ['#666666','#2b5c8f','#315646','#b83a24'])
    return cm(float(np.clip(np.log1p(t)/np.log1p(1000),0,1)))
