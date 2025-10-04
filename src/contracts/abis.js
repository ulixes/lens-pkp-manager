// Lens V3 Contract ABIs

export const FEED_ABI = [
  {
    type: 'function',
    name: 'createPost',
    inputs: [
      {
        name: 'postParams',
        type: 'tuple',
        components: [
          { name: 'author', type: 'address' },
          { name: 'contentURI', type: 'string' },
          { name: 'repostedPostId', type: 'uint256' },
          { name: 'quotedPostId', type: 'uint256' },
          { name: 'repliedPostId', type: 'uint256' },
          {
            name: 'ruleChanges',
            type: 'tuple[]',
            components: [
              { name: 'ruleAddress', type: 'address' },
              { name: 'configSalt', type: 'bytes32' },
              {
                name: 'configurationChanges',
                type: 'tuple',
                components: [
                  { name: 'configure', type: 'bool' },
                  {
                    name: 'ruleParams',
                    type: 'tuple[]',
                    components: [
                      { name: 'key', type: 'bytes32' },
                      { name: 'value', type: 'bytes' }
                    ]
                  }
                ]
              },
              {
                name: 'selectorChanges',
                type: 'tuple[]',
                components: [
                  { name: 'ruleSelector', type: 'bytes4' },
                  { name: 'isRequired', type: 'bool' },
                  { name: 'enabled', type: 'bool' }
                ]
              }
            ]
          },
          {
            name: 'extraData',
            type: 'tuple[]',
            components: [
              { name: 'key', type: 'bytes32' },
              { name: 'value', type: 'bytes' }
            ]
          }
        ]
      },
      {
        name: 'customParams',
        type: 'tuple[]',
        components: [
          { name: 'key', type: 'bytes32' },
          { name: 'value', type: 'bytes' }
        ]
      },
      {
        name: 'feedRulesParams',
        type: 'tuple[]',
        components: [
          { name: 'ruleAddress', type: 'address' },
          { name: 'configSalt', type: 'bytes32' },
          {
            name: 'ruleParams',
            type: 'tuple[]',
            components: [
              { name: 'key', type: 'bytes32' },
              { name: 'value', type: 'bytes' }
            ]
          }
        ]
      },
      {
        name: 'rootPostRulesParams',
        type: 'tuple[]',
        components: [
          { name: 'ruleAddress', type: 'address' },
          { name: 'configSalt', type: 'bytes32' },
          {
            name: 'ruleParams',
            type: 'tuple[]',
            components: [
              { name: 'key', type: 'bytes32' },
              { name: 'value', type: 'bytes' }
            ]
          }
        ]
      },
      {
        name: 'quotedPostRulesParams',
        type: 'tuple[]',
        components: [
          { name: 'ruleAddress', type: 'address' },
          { name: 'configSalt', type: 'bytes32' },
          {
            name: 'ruleParams',
            type: 'tuple[]',
            components: [
              { name: 'key', type: 'bytes32' },
              { name: 'value', type: 'bytes' }
            ]
          }
        ]
      }
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable'
  }
]

export const ACCOUNT_ABI = [
  {
    type: 'function',
    name: 'executeTransaction',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' }
    ],
    outputs: [{ name: '', type: 'bytes' }],
    stateMutability: 'payable'
  }
]

// Lens V3 Testnet Contract Addresses
export const LENS_V3_ADDRESSES = {
  GLOBAL_FEED: '0x31232Cb7dE0dce17949ffA58E9E38EEeB367C871'
}
