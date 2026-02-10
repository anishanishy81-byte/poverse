const isStaticExportBuild = process.env.BUILD_ANDROID === "true";

export const staticExportDynamic = isStaticExportBuild ? "force-static" : "force-dynamic";

export const getStaticExportResponse = () =>
  new Response(
    JSON.stringify({
      success: false,
      error: "API disabled in static export build",
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

export { isStaticExportBuild };
