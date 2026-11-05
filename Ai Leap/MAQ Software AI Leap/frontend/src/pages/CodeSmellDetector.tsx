import React from 'react'
import CodeSecurityScanner from '../components/codeSecurityScanner/CodeSecurityScanner';


function CodeSmellDetector() {
  return (
    <div className="shadow-lg border border-border rounded-xl bg-card h-[96vh] p-2">
          <CodeSecurityScanner />
        </div>
  )
}

export default CodeSmellDetector