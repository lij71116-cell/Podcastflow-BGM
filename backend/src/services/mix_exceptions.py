"""混音合成相关异常。"""


class MixResourceNotFoundError(Exception):
    """播客或 BGM 资源不存在或不属于当前 Session。"""


class MixForbiddenError(Exception):
    """无权访问该组合音频资产。"""


class FFmpegUnavailableError(Exception):
    """FFmpeg 不可用。"""


class MixPreviewError(Exception):
    """混音试听生成失败。"""


class MixInProgressError(Exception):
    """合成进行中，不可重复提交。"""
