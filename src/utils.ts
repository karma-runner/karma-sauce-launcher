export async function waitUntil({condition, retries = 0, maxRetries = 50, interval = 200}) {
  try {
    return await condition()
  } catch (error) {
    if (retries >= maxRetries) {
      throw error;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, interval))

  return waitUntil({condition, retries: retries++, maxRetries, interval})
}
