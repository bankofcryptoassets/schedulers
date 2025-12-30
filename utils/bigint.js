const amplify = (a, b) => {
    // return BigNumber.from(a).add(
    //     BigNumber.from(a).mul(BigNumber.from(b)).div(100)
    // )
    return BigInt(a + ((BigInt(a) * BigInt(b)) / BigInt(100)));
}

module.exports = {
    amplify
}
