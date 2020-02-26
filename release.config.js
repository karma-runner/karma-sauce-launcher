module.exports = {
  debug: true,
  branches: 'master',
  verifyConditions: [
    '@semantic-release/changelog',
    '@semantic-release/github'
  ],
  prepare: [
    '@semantic-release/changelog',
    '@semantic-release/git'
  ],
  publish: [
    '@semantic-release/github'
  ],
  success: [
    '@semantic-release/github'
  ]
}
