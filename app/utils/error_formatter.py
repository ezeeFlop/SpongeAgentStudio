from typing import List, Dict
import traceback
import sys
from colorama import Fore, Style, init
import os

# Initialize colorama for cross-platform color support
init()

def is_project_file(filename: str) -> bool:
    # Determine if the file is from your project (not from site-packages or stdlib)
    app_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return app_dir in filename and 'site-packages' not in filename

def get_formatted_traceback() -> List[Dict[str, str]]:
    """Extract and format the current exception's traceback."""
    exc_type, exc_value, exc_traceback = sys.exc_info()
    stack_frames = []
    
    if exc_traceback:
        for frame in traceback.extract_tb(exc_traceback):
            stack_frames.append(format_stack_frame(
                filename=frame.filename,
                line=frame.lineno,
                function=frame.name,
                code=frame.line
            ))
    
    return stack_frames

def format_stack_frame(filename: str, line: int, function: str, code: str) -> Dict[str, str]:
    # Convert to relative path for cleaner output
    try:
        filename = os.path.relpath(filename)
    except ValueError:
        pass
    
    return {
        "filename": filename,
        "line": str(line),
        "function": function,
        "code": code.strip() if code else "",
        "is_project_file": is_project_file(filename)
    }

def format_error_message(exc: Exception, stack_frames: List[Dict[str, str]]) -> str:
    # Find the first project file in the stack trace (likely the error source)
    error_frame = next((frame for frame in reversed(stack_frames) if frame['is_project_file']), None)
    
    formatted_error = [
        f"\n{Fore.RED}{'=' * 80}{Style.RESET_ALL}",
        f"{Fore.RED}ERROR TYPE: {Style.BRIGHT}{exc.__class__.__name__}{Style.RESET_ALL}",
        f"{Fore.RED}MESSAGE: {Style.BRIGHT}{str(exc)}{Style.RESET_ALL}"
    ]

    # If we found the error source in our code, highlight it
    if error_frame:
        formatted_error.extend([
            f"\n{Fore.YELLOW}ERROR LOCATION:{Style.RESET_ALL}",
            f"{Fore.RED}→ {error_frame['filename']}:{error_frame['line']} in {error_frame['function']}{Style.RESET_ALL}",
            f"  {Fore.WHITE}{error_frame['code']}{Style.RESET_ALL}",
        ])

    formatted_error.extend([
        f"\n{Fore.YELLOW}FULL STACK TRACE:{Style.RESET_ALL}\n"
    ])

    for frame in reversed(stack_frames):
        # Format: filename:line for IDE clickable links
        location = f"{frame['filename']}:{frame['line']}"
        
        # Highlight project files
        if frame['is_project_file']:
            prefix = f"{Fore.GREEN}→ {Style.BRIGHT}"
            suffix = Style.RESET_ALL
        else:
            prefix = f"{Fore.BLUE}  "
            suffix = Style.RESET_ALL
            
        formatted_error.extend([
            f"{prefix}{location} in {frame['function']}{suffix}",
            f"    {Fore.WHITE}{frame['code']}{Style.RESET_ALL}",
            ""
        ])

    formatted_error.append(f"{Fore.RED}{'=' * 80}{Style.RESET_ALL}")
    return "\n".join(formatted_error)
