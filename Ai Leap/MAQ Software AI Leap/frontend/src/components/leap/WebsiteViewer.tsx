import { FC } from "react";
import RAGComponent from '@/components/solutions/ReusableComponents/RAGComponent';
import { SweAgentPage } from "@/components/productivity/SweAgentPage";

interface WebsiteViewerProps {
  url: string;
  title: string;
}

export const WebsiteViewer: FC<WebsiteViewerProps> = ({ url, title }) => {
  // Support an internal scheme to render app components inside the viewer
  if (url && url.startsWith('internal://')) {
    const key = url.replace('internal://', '');
    if (key === 'rag') {
      return (
        <div className="w-full h-full animate-leap-fade-in-up overflow-auto p-0">
          <RAGComponent />
        </div>
      );
    }
    if (key === "swe-agent") {
      return (
        <div className="w-full h-full animate-leap-fade-in-up overflow-auto p-0">
          <SweAgentPage />
        </div>
      );
    }
    // Add other internal components here if needed
    return <div>Internal resource: {key} not found</div>;
  }

  return (
    <div className="w-full h-full animate-leap-fade-in-up">
      {/* Website iframe - full height and width */}
      <iframe
        src={url}
        title={title}
        className="w-full h-full border-none"
        allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; magnetometer; microphone; midi; payment; usb"
      />
    </div>
  );
};
