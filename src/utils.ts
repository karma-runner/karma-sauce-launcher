export async function waitUntil({condition, retries = 0, maxRetries = 50, interval = 200}) {
  try {
    return await condition()
  } catch (error) {
    if (retries >= maxRetries) {
      throw error;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, interval))

  return waitUntil({condition, retries: retries + 1, maxRetries, interval})
}

export function isW3C(capabilities){
  // Only browserVersion is mandatory, platformName is optional
  return Boolean(capabilities.browserVersion)
}
