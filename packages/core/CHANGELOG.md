# @bimo-dk/nexus-core

## 0.1.1

### Patch Changes

- b3798da: Add upstreamUrl field and retry logic for dynamic remote routing.

  RemoteConfig and AddRemoteRequest gain an optional upstreamUrl field so the
  gateway knows the internal Docker URL to proxy traffic through. NexusRuntimeConfig
  also exposes upstreamUrl so remotes can announce it on self-registration.

  SelfRegisterService now retries with exponential backoff (up to 5 attempts,
  starting at 1 s) so remotes that start before the registry is ready still
  register successfully instead of silently dropping.
