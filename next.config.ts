import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "react-native",
    "react-native-web",
    "react-native-unistyles",
    "react-native-nitro-modules",
  ],
  turbopack: {
    resolveAlias: {
      "react-native": "react-native-web",
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "react-native$": "react-native-web",
    };

    return config;
  },
};

export default nextConfig;
