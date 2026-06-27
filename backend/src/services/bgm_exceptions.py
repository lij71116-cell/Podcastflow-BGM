"""BGM 业务异常。"""


class BgmFormatError(ValueError):
    """格式不支持。"""


class BgmTooLargeError(ValueError):
    """文件过大。"""


class BgmUrlUnavailableError(ValueError):
    """BGM 链接不可用。"""


class FfprobeUnavailableError(RuntimeError):
    """ffprobe 未安装或不可用。"""


class QishuiUrlInvalidError(ValueError):
    """汽水音乐分享链接格式无效。"""


class QishuiParseError(ValueError):
    """汽水音乐页面解析失败。"""


class QishuiPaidTrackError(ValueError):
    """汽水音乐付费曲目。"""


class BgmNotFoundError(LookupError):
    """BGM 资源不存在或无权访问。"""
