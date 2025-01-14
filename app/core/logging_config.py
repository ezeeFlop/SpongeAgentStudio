import logging
import sys
from colorlog import ColoredFormatter

def setup_logging():
    # Remove all existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Configure root logger
    root_logger.setLevel(logging.INFO)
    
    # Create console handler with colored formatter
    console_handler = logging.StreamHandler(sys.stdout)
    colored_formatter = ColoredFormatter(
        "%(cyan)s%(asctime)s%(reset)s - "
        "%(log_color)s%(levelname)-8s%(reset)s - "
        "%(blue)s%(name)s%(reset)s:"
        "%(purple)s%(lineno)d%(reset)s - "
        "%(log_color)s%(message)s%(reset)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        log_colors={
            'DEBUG':    'white',
            'INFO':     'green',
            'WARNING':  'yellow',
            'ERROR':    'red',
            'CRITICAL': 'red,bg_white',
        },
        secondary_log_colors={},
        style='%'
    )
    console_handler.setFormatter(colored_formatter)
    root_logger.addHandler(console_handler)
    
    # Set third-party loggers to WARNING to reduce noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)