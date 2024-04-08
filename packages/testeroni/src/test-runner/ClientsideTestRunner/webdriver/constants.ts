export const getServerURL = (username: string, accessKey: string): string => `http://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;
export const getDefaultCapabilities = ({
  build,
  project,
}: {
  build: string;
  project: string;
}) => ({
  build,
  project,
  // 'browserstack.local': true,
  // 'browserstack.localIdentifier': process.env.BROWSERSTACK_LOCAL_IDENTIFIER,
});
