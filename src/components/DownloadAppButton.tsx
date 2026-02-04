"use client";

import { Button, ButtonProps } from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";
import { isNativeApp } from "@/lib/platform";

interface DownloadAppButtonProps extends ButtonProps {
  label?: string;
}

const DownloadAppButton = ({ label = "Download App", ...props }: DownloadAppButtonProps) => {
  if (isNativeApp()) return null;

  const downloadUrl = process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL || "/downloads/po-verse.apk";
  const isExternal = /^https?:\/\//i.test(downloadUrl);

  return (
    <Button
      component="a"
      href={downloadUrl}
      download={isExternal ? undefined : true}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      startIcon={<GetAppIcon />}
      {...props}
    >
      {label}
    </Button>
  );
};

export default DownloadAppButton;
