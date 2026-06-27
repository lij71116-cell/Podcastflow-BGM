"""小宇宙解析异常。"""


class PodcastUrlInvalidError(ValueError):
    """链接格式无效。"""


class PodcastParseError(RuntimeError):
    """公开单集页面解析失败。"""


class PodcastNotFoundError(LookupError):
    """播客资源不存在或无权访问。"""
