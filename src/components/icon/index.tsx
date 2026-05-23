"use client";

import { ReactNode } from "react";

// Explicit imports for tree-shaking
import {
  RiAddLine,
  RiAppsLine,
  RiArticleLine,
  RiBankCardLine,
  RiBarChart2Line,
  RiBookLine,
  RiChatSmile3Line,
  RiCheckLine,
  RiClapperboardAiLine,
  RiCloudy2Fill,
  RiCloudyFill,
  RiCodeFill,
  RiFileCopyLine,
  RiDashboardLine,
  RiDatabase2Line,
  RiDiscordFill,
  RiDiscordLine,
  RiDownloadCloudLine,
  RiDownloadLine,
  RiEditLine,
  RiEmotionSadFill,
  RiEyeLine,
  RiFileTextLine,
  RiFlashlightFill,
  RiGithubFill,
  RiGithubLine,
  RiHomeLine,
  RiImageLine,
  RiKey2Fill,
  RiKey2Line,
  RiMagicLine,
  RiMailLine,
  RiMessage2Line,
  RiMoneyCnyCircleFill,
  RiMoneyDollarBoxLine,
  RiMoneyDollarCircleLine,
  RiMusicLine,
  RiNextjsFill,
  RiOrderPlayLine,
  RiPaletteLine,
  RiQuestionLine,
  RiRefreshLine,
  RiRobot2Line,
  RiRocketLine,
  RiShieldCheckLine,
  RiShieldUserLine,
  RiSparkling2Line,
  RiSpeedLine,
  RiTeamLine,
  RiTwitterLine,
  RiUploadCloud2Line,
  RiUserLine,
  RiUserSmileLine,
} from "react-icons/ri";

import { FaRegHeart } from "react-icons/fa";
import { GoArrowUpRight, GoThumbsup } from "react-icons/go";

const Ri = {
  RiAddLine,
  RiAppsLine,
  RiArticleLine,
  RiBankCardLine,
  RiBarChart2Line,
  RiBookLine,
  RiChatSmile3Line,
  RiCheckLine,
  RiClapperboardAiLine,
  RiCloudy2Fill,
  RiCloudyFill,
  RiCodeFill,
  RiFileCopyLine,
  RiDashboardLine,
  RiDatabase2Line,
  RiDiscordFill,
  RiDiscordLine,
  RiDownloadCloudLine,
  RiDownloadLine,
  RiEditLine,
  RiEmotionSadFill,
  RiEyeLine,
  RiFileTextLine,
  RiFlashlightFill,
  RiGithubFill,
  RiGithubLine,
  RiHomeLine,
  RiImageLine,
  RiKey2Fill,
  RiKey2Line,
  RiMagicLine,
  RiMailLine,
  RiMessage2Line,
  RiMoneyCnyCircleFill,
  RiMoneyDollarBoxLine,
  RiMoneyDollarCircleLine,
  RiMusicLine,
  RiNextjsFill,
  RiOrderPlayLine,
  RiPaletteLine,
  RiQuestionLine,
  RiRefreshLine,
  RiRobot2Line,
  RiRocketLine,
  RiShieldCheckLine,
  RiShieldUserLine,
  RiSparkling2Line,
  RiSpeedLine,
  RiTeamLine,
  RiTwitterLine,
  RiUploadCloud2Line,
  RiUserLine,
  RiUserSmileLine,
};

const Fa = {
  FaRegHeart,
};

const Go = {
  GoArrowUpRight,
  GoThumbsup,
};

// Map of prefixes to icon packages
const iconPackages: { [key: string]: any } = {
  Ri,
  Fa,
  Go,
};

export default function Icon({
  name,
  className,
  onClick,
}: {
  name: string;
  className?: string;
  onClick?: () => void;
}) {
  function getIcon(name: string): ReactNode {
    // Extract prefix (first two characters)
    const prefix = name.slice(0, 2);

    // Get the corresponding icon package
    const iconPackage = iconPackages[prefix];
    if (iconPackage) {
      const iconName = name as keyof typeof iconPackage;
      return iconPackage[iconName] || null;
    }

    return null;
  }

  const IconComponent = getIcon(name) as React.ElementType;

  // Return null if no icon is found
  if (!IconComponent) return null;

  // Render the icon component instead of returning it directly
  return (
    <IconComponent
      className={`${className} cursor-pointer`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    />
  );
}
