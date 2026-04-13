import bCrypt from 'bcryptjs';

export default class CryptoUtil {
  /**
   * @param {string} password
   *  @return {string}
   * @description Creates hash password from a given string.
   */
  static createHash(password: string) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10));
  }

  /**
   * @param {string} password
   * @param {string} hashPassword
   * @returns {boolean}
   * @description Compares string password with hash password.
   */
  static isValidPassword(password: string, hashPassword: string) {
    return bCrypt.compareSync(password, hashPassword);
  }
}
