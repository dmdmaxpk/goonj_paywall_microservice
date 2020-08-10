
//Helper class - define all basic functions
class Helper {
    static getCurrentDate() {
        let now = new Date();
        let strDateTime = [
            [now.getFullYear(),
                this.addZero(now.getMonth() + 1),
                this.addZero(now.getDate())].join("-"),
            [this.addZero(now.getHours()),
                this.addZero(now.getMinutes())].join(":")];
        return strDateTime;
    }

    static addZero(num) {
        return (num >= 0 && num < 10) ? "0" + num : num + "";
    }

    static easypaisaPrivateKey()
    {
        return 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCZ7GigJNLnnsxXUy6xkoanVhoA6JbBvXbdLTmR9usnAB2TrKWE26wtYsdYeFfnpczaCAi+8wfGcEiVbyL0Iz37aMBMVMMgkE5SrGU3t0gNhONN+vF7x22amHMBv7zn6sJ53V6INhoxMBbt448ztL+QSY6oKRdsf1mvKxKziz3FcTq9v6s4Ra0M1AwxWStR/q0PDIV2q5jjQ4Jdmmlh/fBIMOl4YQWNpbvBD43rrBz4fxaJdV++vcA/HLD5mXv06CnZdQeaUeUKxQLSdCCDqMo0B9pgKL+ZhBBYUt3GjyTwZScw3enqZsHQHaLlZd2RdN5cGKvJoACdLoNZHweuXjUXAgMBAAECggEAWHgM2p7PqdkX0ck5uU5inqNaZtNIcyqWuyFXSZIGLnBej5ZXvDkWiS+RLERfIgGl8FtVy4qcGW5ICbvK90+aPHpErJq7XGgU3GfB9XgercaHbzagvWgukwC0eXje9t1z0d9uihOukj71rt1wXWOyBxiAKh8UG4RG4+t54EBTzLsV+GQl41PJgq+G85ysruk/cPJM27hc/GbzkYcncArIBYgQvZdLsdnXTd6Vc/I25YTeYR8FGwKZXNrw8B8xj/71wuS6RLjcl8PFUhxpmO0NMJJ3+dzXQ6hUBOffB/WVKyiOxnc8Ppka1Gqw7t0jAsNrb7/x5xoMsKBTOnfKL1jcQQKBgQDgwwFYKu1rj7TvSwvmvbwMIQIwnjQpx7gD9tbkfpLTd/yFrat49mp4TH96tqDEx3evxZUyE2uoywcgKrKO92PAA+nxbfnK8q2GNmyR2QQc5a8ETQRNTqIwlx2OJx+cpYljagaBdkVKcuIg5VZUMXKVd1FpOE4OnOVIwmTL9W3eDwKBgQCvUPyW6L4VrVcoL+vH6X+5aJP0yaR5fK1I5fhxBYwrPxBhr/WBp5Ybhc/2zxpwoe3nF2fC7XanGiCeIpp4bVM5WdXPWMUooj4p2I73l1Lx4eiq7hxrVG1Otwq2dt8lVZynz2QZOXTjD3I4x+H2R0ERHa42JpC+acieQboev8vAeQKBgDgqYtaee4/qbGNz1HiHp0s8oGh30D80ilZrQ43710MC89aP7I6gvUBslVqb8pbZ5Z3F+R93XOrkOVafdNlnFsUv9TEAs3A0roogZYcYvP9fohmoCVAsOzl7OcaBHlQtxaRTJWcKoAwXo0xnIuiNJr4VAAIUMOVT7bP95+RT422fAoGBAKUIis6Qh6emRl6JRd4pm1dw757GVrMaP5FZEtdqDnoDYqti1axYkwCTpaJDcTNH68jXipC/sys4eC4Eiv8EgwyA2bnXabmHiRchSeweojEapUiK32vVzRQFUOtU2Viuz8pUe3kXUkYQm0iCON76UnEHTKCjCyyELhtz6f3aNLaZAoGAB07xa2Lp9RqdPuH8ufkGHh5Xv/In2gXAMmNTv4CK2sxx27gBSldHals424qxvHnHNOf7xsxMW9FtwIlnAOQ6lTb+Pywt5NIRU/S9sxx4NMeY/yf4KU/Vea2B59atdmRIC9GuQGJMhx9NnzJXTNE/YoVdqtCEJr7TpbwBdREV3z4=';
    }
}

module.exports = Helper;