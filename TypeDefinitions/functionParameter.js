class functionParameter {
    
    constructor(type,name,value,uintIntMValue = "",bytesMValue = "") {
        this.type = type;
        this.name = name;
        this.value = value;
        if (uintIntMValue != ""){
            this.uintIntMValue = uintIntMValue;
        }
        if (bytesMValue != ""){
            this.bytesMValue = bytesMValue;
        }
    }

}
exports.default = functionParameter;