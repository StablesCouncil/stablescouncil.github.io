/**
 * Minima-Integration.js
 * Wrapper around MDS library for cleaner, promise-based Minima blockchain interactions
 * 
 * MDS (Minima Dapp System) is automatically provided by MinimaOS
 * This file provides async/await wrappers for easier development
 */

'use strict';

const Minima = {
  /**
   * Get current balance (all tokens)
   * @returns {Promise<Object>} Balance data including MINIMA and custom tokens
   */
  async getBalance() {
    return new Promise((resolve, reject) => {
      MDS.cmd("balance", function(response) {
        if (response.status) {
          resolve(response.response);
        } else {
          reject(new Error(response.error || "Failed to get balance"));
        }
      });
    });
  },

  /**
   * Get wallet address
   * @returns {Promise<string>} Minima address
   */
  async getAddress() {
    return new Promise((resolve, reject) => {
      MDS.cmd("getaddress", function(response) {
        if (response.status) {
          resolve(response.response.miniaddress);
        } else {
          reject(new Error(response.error || "Failed to get address"));
        }
      });
    });
  },

  /**
   * Get node status (block height, sync status, etc.)
   * @returns {Promise<Object>} Node status information
   */
  async getStatus() {
    return new Promise((resolve, reject) => {
      MDS.cmd("status", function(response) {
        if (response.status) {
          resolve(response.response);
        } else {
          reject(new Error(response.error || "Failed to get status"));
        }
      });
    });
  },

  /**
   * Send tokens to an address
   * @param {string} address - Recipient Minima address
   * @param {number} amount - Amount to send
   * @param {string} tokenid - Token ID (0x00 for MINIMA, or custom token ID)
   * @returns {Promise<Object>} Transaction response
   */
  async sendTokens(address, amount, tokenid = "0x00") {
    return new Promise((resolve, reject) => {
      const cmd = `send address:${address} amount:${amount} tokenid:${tokenid}`;
      MDS.cmd(cmd, function(response) {
        if (response.status) {
          resolve(response.response);
        } else {
          reject(new Error(response.error || "Failed to send tokens"));
        }
      });
    });
  },

  /**
   * Create a custom token
   * @param {string} name - Token name
   * @param {number} amount - Total supply
   * @param {string} description - Token description (optional)
   * @returns {Promise<Object>} Token creation response with tokenid
   */
  async createToken(name, amount, description = "") {
    return new Promise((resolve, reject) => {
      const cmd = `tokencreate name:"${name}" amount:${amount} description:"${description}"`;
      MDS.cmd(cmd, function(response) {
        if (response.status) {
          resolve(response.response);
        } else {
          reject(new Error(response.error || "Failed to create token"));
        }
      });
    });
  },

  /**
   * Get balance of a specific token
   * @param {string} tokenid - Token ID
   * @returns {Promise<number>} Token balance
   */
  async getTokenBalance(tokenid) {
    try {
      const balanceData = await this.getBalance();
      const token = balanceData.find(t => t.tokenid === tokenid);
      return token ? parseFloat(token.confirmed) : 0;
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  },

  /**
   * Execute a custom Minima command
   * @param {string} command - Raw Minima command
   * @returns {Promise<Object>} Command response
   */
  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      MDS.cmd(command, function(response) {
        if (response.status) {
          resolve(response.response);
        } else {
          reject(new Error(response.error || "Command failed"));
        }
      });
    });
  },

  /**
   * Check if MDS is available (for browser development)
   * @returns {boolean} True if running in MinimaOS
   */
  isAvailable() {
    return typeof MDS !== 'undefined';
  }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.Minima = Minima;
}



