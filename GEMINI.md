# Project Guidelines

## Core Directives
- **Code Authoring:** 코드를 작성하거나 수정할 때는 항상 `filesystem` 관련 도구(`write_file`, `replace`, `mcp_filesystem_edit_file` 등)를 사용하여 정밀하게 작업하십시오.
- **Verification & Testing:** 작업 완료 후에는 `playwright` 도구(`mcp_playwright_browser_run_code`, `mcp_playwright_browser_snapshot` 등)를 사용하여 기능이 올바르게 작동하는지 실제 브라우저 환경에서 철저히 검증하십시오.
- **Validation Rigor:** 단순한 코드 작성을 넘어 실제 실행 환경에서의 동작을 시각적으로 확인하거나 네트워크 요청 등을 추적하여 완결성을 확보하십시오.
