/** Full world country catalog for /services — never shrink to a short list. */
export type WorldCountry = {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  availability: number;
  sortOrder: number;
};

export const WORLD_COUNTRIES: WorldCountry[] = [
  {
    "code": "AF",
    "name": "Afghanistan",
    "flag": "🇦🇫",
    "dialCode": "+93",
    "availability": 40,
    "sortOrder": 0
  },
  {
    "code": "AL",
    "name": "Albania",
    "flag": "🇦🇱",
    "dialCode": "+355",
    "availability": 57,
    "sortOrder": 1
  },
  {
    "code": "DZ",
    "name": "Algeria",
    "flag": "🇩🇿",
    "dialCode": "+213",
    "availability": 74,
    "sortOrder": 2
  },
  {
    "code": "AS",
    "name": "American Samoa",
    "flag": "🇦🇸",
    "dialCode": "+1",
    "availability": 91,
    "sortOrder": 3
  },
  {
    "code": "AD",
    "name": "Andorra",
    "flag": "🇦🇩",
    "dialCode": "+376",
    "availability": 108,
    "sortOrder": 4
  },
  {
    "code": "AO",
    "name": "Angola",
    "flag": "🇦🇴",
    "dialCode": "+244",
    "availability": 125,
    "sortOrder": 5
  },
  {
    "code": "AI",
    "name": "Anguilla",
    "flag": "🇦🇮",
    "dialCode": "+1",
    "availability": 142,
    "sortOrder": 6
  },
  {
    "code": "AG",
    "name": "Antigua and Barbuda",
    "flag": "🇦🇬",
    "dialCode": "+1",
    "availability": 159,
    "sortOrder": 7
  },
  {
    "code": "AR",
    "name": "Argentina",
    "flag": "🇦🇷",
    "dialCode": "+54",
    "availability": 176,
    "sortOrder": 8
  },
  {
    "code": "AM",
    "name": "Armenia",
    "flag": "🇦🇲",
    "dialCode": "+374",
    "availability": 193,
    "sortOrder": 9
  },
  {
    "code": "AW",
    "name": "Aruba",
    "flag": "🇦🇼",
    "dialCode": "+297",
    "availability": 210,
    "sortOrder": 10
  },
  {
    "code": "AU",
    "name": "Australia",
    "flag": "🇦🇺",
    "dialCode": "+61",
    "availability": 47,
    "sortOrder": 11
  },
  {
    "code": "AT",
    "name": "Austria",
    "flag": "🇦🇹",
    "dialCode": "+43",
    "availability": 64,
    "sortOrder": 12
  },
  {
    "code": "AZ",
    "name": "Azerbaijan",
    "flag": "🇦🇿",
    "dialCode": "+994",
    "availability": 81,
    "sortOrder": 13
  },
  {
    "code": "BS",
    "name": "Bahamas",
    "flag": "🇧🇸",
    "dialCode": "+1",
    "availability": 98,
    "sortOrder": 14
  },
  {
    "code": "BH",
    "name": "Bahrain",
    "flag": "🇧🇭",
    "dialCode": "+973",
    "availability": 115,
    "sortOrder": 15
  },
  {
    "code": "BD",
    "name": "Bangladesh",
    "flag": "🇧🇩",
    "dialCode": "+880",
    "availability": 132,
    "sortOrder": 16
  },
  {
    "code": "BB",
    "name": "Barbados",
    "flag": "🇧🇧",
    "dialCode": "+1",
    "availability": 149,
    "sortOrder": 17
  },
  {
    "code": "BY",
    "name": "Belarus",
    "flag": "🇧🇾",
    "dialCode": "+375",
    "availability": 166,
    "sortOrder": 18
  },
  {
    "code": "BE",
    "name": "Belgium",
    "flag": "🇧🇪",
    "dialCode": "+32",
    "availability": 183,
    "sortOrder": 19
  },
  {
    "code": "BZ",
    "name": "Belize",
    "flag": "🇧🇿",
    "dialCode": "+501",
    "availability": 200,
    "sortOrder": 20
  },
  {
    "code": "BJ",
    "name": "Benin",
    "flag": "🇧🇯",
    "dialCode": "+229",
    "availability": 217,
    "sortOrder": 21
  },
  {
    "code": "BM",
    "name": "Bermuda",
    "flag": "🇧🇲",
    "dialCode": "+1",
    "availability": 54,
    "sortOrder": 22
  },
  {
    "code": "BT",
    "name": "Bhutan",
    "flag": "🇧🇹",
    "dialCode": "+975",
    "availability": 71,
    "sortOrder": 23
  },
  {
    "code": "BO",
    "name": "Bolivia",
    "flag": "🇧🇴",
    "dialCode": "+591",
    "availability": 88,
    "sortOrder": 24
  },
  {
    "code": "BA",
    "name": "Bosnia and Herzegovina",
    "flag": "🇧🇦",
    "dialCode": "+387",
    "availability": 105,
    "sortOrder": 25
  },
  {
    "code": "BW",
    "name": "Botswana",
    "flag": "🇧🇼",
    "dialCode": "+267",
    "availability": 122,
    "sortOrder": 26
  },
  {
    "code": "BR",
    "name": "Brazil",
    "flag": "🇧🇷",
    "dialCode": "+55",
    "availability": 139,
    "sortOrder": 27
  },
  {
    "code": "VG",
    "name": "British Virgin Islands",
    "flag": "🇻🇬",
    "dialCode": "+1",
    "availability": 156,
    "sortOrder": 28
  },
  {
    "code": "BN",
    "name": "Brunei",
    "flag": "🇧🇳",
    "dialCode": "+673",
    "availability": 173,
    "sortOrder": 29
  },
  {
    "code": "BG",
    "name": "Bulgaria",
    "flag": "🇧🇬",
    "dialCode": "+359",
    "availability": 190,
    "sortOrder": 30
  },
  {
    "code": "BF",
    "name": "Burkina Faso",
    "flag": "🇧🇫",
    "dialCode": "+226",
    "availability": 207,
    "sortOrder": 31
  },
  {
    "code": "BI",
    "name": "Burundi",
    "flag": "🇧🇮",
    "dialCode": "+257",
    "availability": 44,
    "sortOrder": 32
  },
  {
    "code": "KH",
    "name": "Cambodia",
    "flag": "🇰🇭",
    "dialCode": "+855",
    "availability": 61,
    "sortOrder": 33
  },
  {
    "code": "CM",
    "name": "Cameroon",
    "flag": "🇨🇲",
    "dialCode": "+237",
    "availability": 78,
    "sortOrder": 34
  },
  {
    "code": "CA",
    "name": "Canada",
    "flag": "🇨🇦",
    "dialCode": "+1",
    "availability": 95,
    "sortOrder": 35
  },
  {
    "code": "CV",
    "name": "Cape Verde",
    "flag": "🇨🇻",
    "dialCode": "+238",
    "availability": 112,
    "sortOrder": 36
  },
  {
    "code": "KY",
    "name": "Cayman Islands",
    "flag": "🇰🇾",
    "dialCode": "+1",
    "availability": 129,
    "sortOrder": 37
  },
  {
    "code": "CF",
    "name": "Central African Republic",
    "flag": "🇨🇫",
    "dialCode": "+236",
    "availability": 146,
    "sortOrder": 38
  },
  {
    "code": "TD",
    "name": "Chad",
    "flag": "🇹🇩",
    "dialCode": "+235",
    "availability": 163,
    "sortOrder": 39
  },
  {
    "code": "CL",
    "name": "Chile",
    "flag": "🇨🇱",
    "dialCode": "+56",
    "availability": 180,
    "sortOrder": 40
  },
  {
    "code": "CN",
    "name": "China",
    "flag": "🇨🇳",
    "dialCode": "+86",
    "availability": 197,
    "sortOrder": 41
  },
  {
    "code": "CO",
    "name": "Colombia",
    "flag": "🇨🇴",
    "dialCode": "+57",
    "availability": 214,
    "sortOrder": 42
  },
  {
    "code": "KM",
    "name": "Comoros",
    "flag": "🇰🇲",
    "dialCode": "+269",
    "availability": 51,
    "sortOrder": 43
  },
  {
    "code": "CG",
    "name": "Congo",
    "flag": "🇨🇬",
    "dialCode": "+242",
    "availability": 68,
    "sortOrder": 44
  },
  {
    "code": "CD",
    "name": "Congo (DRC)",
    "flag": "🇨🇩",
    "dialCode": "+243",
    "availability": 85,
    "sortOrder": 45
  },
  {
    "code": "CR",
    "name": "Costa Rica",
    "flag": "🇨🇷",
    "dialCode": "+506",
    "availability": 102,
    "sortOrder": 46
  },
  {
    "code": "CI",
    "name": "Côte d'Ivoire",
    "flag": "🇨🇮",
    "dialCode": "+225",
    "availability": 119,
    "sortOrder": 47
  },
  {
    "code": "HR",
    "name": "Croatia",
    "flag": "🇭🇷",
    "dialCode": "+385",
    "availability": 136,
    "sortOrder": 48
  },
  {
    "code": "CU",
    "name": "Cuba",
    "flag": "🇨🇺",
    "dialCode": "+53",
    "availability": 153,
    "sortOrder": 49
  },
  {
    "code": "CW",
    "name": "Curaçao",
    "flag": "🇨🇼",
    "dialCode": "+599",
    "availability": 170,
    "sortOrder": 50
  },
  {
    "code": "CY",
    "name": "Cyprus",
    "flag": "🇨🇾",
    "dialCode": "+357",
    "availability": 187,
    "sortOrder": 51
  },
  {
    "code": "CZ",
    "name": "Czechia",
    "flag": "🇨🇿",
    "dialCode": "+420",
    "availability": 204,
    "sortOrder": 52
  },
  {
    "code": "DK",
    "name": "Denmark",
    "flag": "🇩🇰",
    "dialCode": "+45",
    "availability": 41,
    "sortOrder": 53
  },
  {
    "code": "DJ",
    "name": "Djibouti",
    "flag": "🇩🇯",
    "dialCode": "+253",
    "availability": 58,
    "sortOrder": 54
  },
  {
    "code": "DM",
    "name": "Dominica",
    "flag": "🇩🇲",
    "dialCode": "+1",
    "availability": 75,
    "sortOrder": 55
  },
  {
    "code": "DO",
    "name": "Dominican Republic",
    "flag": "🇩🇴",
    "dialCode": "+1",
    "availability": 92,
    "sortOrder": 56
  },
  {
    "code": "EC",
    "name": "Ecuador",
    "flag": "🇪🇨",
    "dialCode": "+593",
    "availability": 109,
    "sortOrder": 57
  },
  {
    "code": "EG",
    "name": "Egypt",
    "flag": "🇪🇬",
    "dialCode": "+20",
    "availability": 126,
    "sortOrder": 58
  },
  {
    "code": "SV",
    "name": "El Salvador",
    "flag": "🇸🇻",
    "dialCode": "+503",
    "availability": 143,
    "sortOrder": 59
  },
  {
    "code": "GQ",
    "name": "Equatorial Guinea",
    "flag": "🇬🇶",
    "dialCode": "+240",
    "availability": 160,
    "sortOrder": 60
  },
  {
    "code": "ER",
    "name": "Eritrea",
    "flag": "🇪🇷",
    "dialCode": "+291",
    "availability": 177,
    "sortOrder": 61
  },
  {
    "code": "EE",
    "name": "Estonia",
    "flag": "🇪🇪",
    "dialCode": "+372",
    "availability": 194,
    "sortOrder": 62
  },
  {
    "code": "SZ",
    "name": "Eswatini",
    "flag": "🇸🇿",
    "dialCode": "+268",
    "availability": 211,
    "sortOrder": 63
  },
  {
    "code": "ET",
    "name": "Ethiopia",
    "flag": "🇪🇹",
    "dialCode": "+251",
    "availability": 48,
    "sortOrder": 64
  },
  {
    "code": "FJ",
    "name": "Fiji",
    "flag": "🇫🇯",
    "dialCode": "+679",
    "availability": 65,
    "sortOrder": 65
  },
  {
    "code": "FI",
    "name": "Finland",
    "flag": "🇫🇮",
    "dialCode": "+358",
    "availability": 82,
    "sortOrder": 66
  },
  {
    "code": "FR",
    "name": "France",
    "flag": "🇫🇷",
    "dialCode": "+33",
    "availability": 99,
    "sortOrder": 67
  },
  {
    "code": "GF",
    "name": "French Guiana",
    "flag": "🇬🇫",
    "dialCode": "+594",
    "availability": 116,
    "sortOrder": 68
  },
  {
    "code": "PF",
    "name": "French Polynesia",
    "flag": "🇵🇫",
    "dialCode": "+689",
    "availability": 133,
    "sortOrder": 69
  },
  {
    "code": "GA",
    "name": "Gabon",
    "flag": "🇬🇦",
    "dialCode": "+241",
    "availability": 150,
    "sortOrder": 70
  },
  {
    "code": "GM",
    "name": "Gambia",
    "flag": "🇬🇲",
    "dialCode": "+220",
    "availability": 167,
    "sortOrder": 71
  },
  {
    "code": "GE",
    "name": "Georgia",
    "flag": "🇬🇪",
    "dialCode": "+995",
    "availability": 184,
    "sortOrder": 72
  },
  {
    "code": "DE",
    "name": "Germany",
    "flag": "🇩🇪",
    "dialCode": "+49",
    "availability": 201,
    "sortOrder": 73
  },
  {
    "code": "GH",
    "name": "Ghana",
    "flag": "🇬🇭",
    "dialCode": "+233",
    "availability": 218,
    "sortOrder": 74
  },
  {
    "code": "GI",
    "name": "Gibraltar",
    "flag": "🇬🇮",
    "dialCode": "+350",
    "availability": 55,
    "sortOrder": 75
  },
  {
    "code": "GR",
    "name": "Greece",
    "flag": "🇬🇷",
    "dialCode": "+30",
    "availability": 72,
    "sortOrder": 76
  },
  {
    "code": "GL",
    "name": "Greenland",
    "flag": "🇬🇱",
    "dialCode": "+299",
    "availability": 89,
    "sortOrder": 77
  },
  {
    "code": "GD",
    "name": "Grenada",
    "flag": "🇬🇩",
    "dialCode": "+1",
    "availability": 106,
    "sortOrder": 78
  },
  {
    "code": "GP",
    "name": "Guadeloupe",
    "flag": "🇬🇵",
    "dialCode": "+590",
    "availability": 123,
    "sortOrder": 79
  },
  {
    "code": "GU",
    "name": "Guam",
    "flag": "🇬🇺",
    "dialCode": "+1",
    "availability": 140,
    "sortOrder": 80
  },
  {
    "code": "GT",
    "name": "Guatemala",
    "flag": "🇬🇹",
    "dialCode": "+502",
    "availability": 157,
    "sortOrder": 81
  },
  {
    "code": "GG",
    "name": "Guernsey",
    "flag": "🇬🇬",
    "dialCode": "+44",
    "availability": 174,
    "sortOrder": 82
  },
  {
    "code": "GN",
    "name": "Guinea",
    "flag": "🇬🇳",
    "dialCode": "+224",
    "availability": 191,
    "sortOrder": 83
  },
  {
    "code": "GW",
    "name": "Guinea-Bissau",
    "flag": "🇬🇼",
    "dialCode": "+245",
    "availability": 208,
    "sortOrder": 84
  },
  {
    "code": "GY",
    "name": "Guyana",
    "flag": "🇬🇾",
    "dialCode": "+592",
    "availability": 45,
    "sortOrder": 85
  },
  {
    "code": "HT",
    "name": "Haiti",
    "flag": "🇭🇹",
    "dialCode": "+509",
    "availability": 62,
    "sortOrder": 86
  },
  {
    "code": "HN",
    "name": "Honduras",
    "flag": "🇭🇳",
    "dialCode": "+504",
    "availability": 79,
    "sortOrder": 87
  },
  {
    "code": "HK",
    "name": "Hong Kong",
    "flag": "🇭🇰",
    "dialCode": "+852",
    "availability": 96,
    "sortOrder": 88
  },
  {
    "code": "HU",
    "name": "Hungary",
    "flag": "🇭🇺",
    "dialCode": "+36",
    "availability": 113,
    "sortOrder": 89
  },
  {
    "code": "IS",
    "name": "Iceland",
    "flag": "🇮🇸",
    "dialCode": "+354",
    "availability": 130,
    "sortOrder": 90
  },
  {
    "code": "IN",
    "name": "India",
    "flag": "🇮🇳",
    "dialCode": "+91",
    "availability": 147,
    "sortOrder": 91
  },
  {
    "code": "ID",
    "name": "Indonesia",
    "flag": "🇮🇩",
    "dialCode": "+62",
    "availability": 164,
    "sortOrder": 92
  },
  {
    "code": "IR",
    "name": "Iran",
    "flag": "🇮🇷",
    "dialCode": "+98",
    "availability": 181,
    "sortOrder": 93
  },
  {
    "code": "IQ",
    "name": "Iraq",
    "flag": "🇮🇶",
    "dialCode": "+964",
    "availability": 198,
    "sortOrder": 94
  },
  {
    "code": "IE",
    "name": "Ireland",
    "flag": "🇮🇪",
    "dialCode": "+353",
    "availability": 215,
    "sortOrder": 95
  },
  {
    "code": "IM",
    "name": "Isle of Man",
    "flag": "🇮🇲",
    "dialCode": "+44",
    "availability": 52,
    "sortOrder": 96
  },
  {
    "code": "IL",
    "name": "Israel",
    "flag": "🇮🇱",
    "dialCode": "+972",
    "availability": 69,
    "sortOrder": 97
  },
  {
    "code": "IT",
    "name": "Italy",
    "flag": "🇮🇹",
    "dialCode": "+39",
    "availability": 86,
    "sortOrder": 98
  },
  {
    "code": "JM",
    "name": "Jamaica",
    "flag": "🇯🇲",
    "dialCode": "+1",
    "availability": 103,
    "sortOrder": 99
  },
  {
    "code": "JP",
    "name": "Japan",
    "flag": "🇯🇵",
    "dialCode": "+81",
    "availability": 120,
    "sortOrder": 100
  },
  {
    "code": "JE",
    "name": "Jersey",
    "flag": "🇯🇪",
    "dialCode": "+44",
    "availability": 137,
    "sortOrder": 101
  },
  {
    "code": "JO",
    "name": "Jordan",
    "flag": "🇯🇴",
    "dialCode": "+962",
    "availability": 154,
    "sortOrder": 102
  },
  {
    "code": "KZ",
    "name": "Kazakhstan",
    "flag": "🇰🇿",
    "dialCode": "+7",
    "availability": 171,
    "sortOrder": 103
  },
  {
    "code": "KE",
    "name": "Kenya",
    "flag": "🇰🇪",
    "dialCode": "+254",
    "availability": 188,
    "sortOrder": 104
  },
  {
    "code": "KI",
    "name": "Kiribati",
    "flag": "🇰🇮",
    "dialCode": "+686",
    "availability": 205,
    "sortOrder": 105
  },
  {
    "code": "XK",
    "name": "Kosovo",
    "flag": "🇽🇰",
    "dialCode": "+383",
    "availability": 42,
    "sortOrder": 106
  },
  {
    "code": "KW",
    "name": "Kuwait",
    "flag": "🇰🇼",
    "dialCode": "+965",
    "availability": 59,
    "sortOrder": 107
  },
  {
    "code": "KG",
    "name": "Kyrgyzstan",
    "flag": "🇰🇬",
    "dialCode": "+996",
    "availability": 76,
    "sortOrder": 108
  },
  {
    "code": "LA",
    "name": "Laos",
    "flag": "🇱🇦",
    "dialCode": "+856",
    "availability": 93,
    "sortOrder": 109
  },
  {
    "code": "LV",
    "name": "Latvia",
    "flag": "🇱🇻",
    "dialCode": "+371",
    "availability": 110,
    "sortOrder": 110
  },
  {
    "code": "LB",
    "name": "Lebanon",
    "flag": "🇱🇧",
    "dialCode": "+961",
    "availability": 127,
    "sortOrder": 111
  },
  {
    "code": "LS",
    "name": "Lesotho",
    "flag": "🇱🇸",
    "dialCode": "+266",
    "availability": 144,
    "sortOrder": 112
  },
  {
    "code": "LR",
    "name": "Liberia",
    "flag": "🇱🇷",
    "dialCode": "+231",
    "availability": 161,
    "sortOrder": 113
  },
  {
    "code": "LY",
    "name": "Libya",
    "flag": "🇱🇾",
    "dialCode": "+218",
    "availability": 178,
    "sortOrder": 114
  },
  {
    "code": "LI",
    "name": "Liechtenstein",
    "flag": "🇱🇮",
    "dialCode": "+423",
    "availability": 195,
    "sortOrder": 115
  },
  {
    "code": "LT",
    "name": "Lithuania",
    "flag": "🇱🇹",
    "dialCode": "+370",
    "availability": 212,
    "sortOrder": 116
  },
  {
    "code": "LU",
    "name": "Luxembourg",
    "flag": "🇱🇺",
    "dialCode": "+352",
    "availability": 49,
    "sortOrder": 117
  },
  {
    "code": "MO",
    "name": "Macao",
    "flag": "🇲🇴",
    "dialCode": "+853",
    "availability": 66,
    "sortOrder": 118
  },
  {
    "code": "MG",
    "name": "Madagascar",
    "flag": "🇲🇬",
    "dialCode": "+261",
    "availability": 83,
    "sortOrder": 119
  },
  {
    "code": "MW",
    "name": "Malawi",
    "flag": "🇲🇼",
    "dialCode": "+265",
    "availability": 100,
    "sortOrder": 120
  },
  {
    "code": "MY",
    "name": "Malaysia",
    "flag": "🇲🇾",
    "dialCode": "+60",
    "availability": 117,
    "sortOrder": 121
  },
  {
    "code": "MV",
    "name": "Maldives",
    "flag": "🇲🇻",
    "dialCode": "+960",
    "availability": 134,
    "sortOrder": 122
  },
  {
    "code": "ML",
    "name": "Mali",
    "flag": "🇲🇱",
    "dialCode": "+223",
    "availability": 151,
    "sortOrder": 123
  },
  {
    "code": "MT",
    "name": "Malta",
    "flag": "🇲🇹",
    "dialCode": "+356",
    "availability": 168,
    "sortOrder": 124
  },
  {
    "code": "MH",
    "name": "Marshall Islands",
    "flag": "🇲🇭",
    "dialCode": "+692",
    "availability": 185,
    "sortOrder": 125
  },
  {
    "code": "MQ",
    "name": "Martinique",
    "flag": "🇲🇶",
    "dialCode": "+596",
    "availability": 202,
    "sortOrder": 126
  },
  {
    "code": "MR",
    "name": "Mauritania",
    "flag": "🇲🇷",
    "dialCode": "+222",
    "availability": 219,
    "sortOrder": 127
  },
  {
    "code": "MU",
    "name": "Mauritius",
    "flag": "🇲🇺",
    "dialCode": "+230",
    "availability": 56,
    "sortOrder": 128
  },
  {
    "code": "MX",
    "name": "Mexico",
    "flag": "🇲🇽",
    "dialCode": "+52",
    "availability": 73,
    "sortOrder": 129
  },
  {
    "code": "FM",
    "name": "Micronesia",
    "flag": "🇫🇲",
    "dialCode": "+691",
    "availability": 90,
    "sortOrder": 130
  },
  {
    "code": "MD",
    "name": "Moldova",
    "flag": "🇲🇩",
    "dialCode": "+373",
    "availability": 107,
    "sortOrder": 131
  },
  {
    "code": "MC",
    "name": "Monaco",
    "flag": "🇲🇨",
    "dialCode": "+377",
    "availability": 124,
    "sortOrder": 132
  },
  {
    "code": "MN",
    "name": "Mongolia",
    "flag": "🇲🇳",
    "dialCode": "+976",
    "availability": 141,
    "sortOrder": 133
  },
  {
    "code": "ME",
    "name": "Montenegro",
    "flag": "🇲🇪",
    "dialCode": "+382",
    "availability": 158,
    "sortOrder": 134
  },
  {
    "code": "MS",
    "name": "Montserrat",
    "flag": "🇲🇸",
    "dialCode": "+1",
    "availability": 175,
    "sortOrder": 135
  },
  {
    "code": "MA",
    "name": "Morocco",
    "flag": "🇲🇦",
    "dialCode": "+212",
    "availability": 192,
    "sortOrder": 136
  },
  {
    "code": "MZ",
    "name": "Mozambique",
    "flag": "🇲🇿",
    "dialCode": "+258",
    "availability": 209,
    "sortOrder": 137
  },
  {
    "code": "MM",
    "name": "Myanmar",
    "flag": "🇲🇲",
    "dialCode": "+95",
    "availability": 46,
    "sortOrder": 138
  },
  {
    "code": "NA",
    "name": "Namibia",
    "flag": "🇳🇦",
    "dialCode": "+264",
    "availability": 63,
    "sortOrder": 139
  },
  {
    "code": "NR",
    "name": "Nauru",
    "flag": "🇳🇷",
    "dialCode": "+674",
    "availability": 80,
    "sortOrder": 140
  },
  {
    "code": "NP",
    "name": "Nepal",
    "flag": "🇳🇵",
    "dialCode": "+977",
    "availability": 97,
    "sortOrder": 141
  },
  {
    "code": "NL",
    "name": "Netherlands",
    "flag": "🇳🇱",
    "dialCode": "+31",
    "availability": 114,
    "sortOrder": 142
  },
  {
    "code": "NC",
    "name": "New Caledonia",
    "flag": "🇳🇨",
    "dialCode": "+687",
    "availability": 131,
    "sortOrder": 143
  },
  {
    "code": "NZ",
    "name": "New Zealand",
    "flag": "🇳🇿",
    "dialCode": "+64",
    "availability": 148,
    "sortOrder": 144
  },
  {
    "code": "NI",
    "name": "Nicaragua",
    "flag": "🇳🇮",
    "dialCode": "+505",
    "availability": 165,
    "sortOrder": 145
  },
  {
    "code": "NE",
    "name": "Niger",
    "flag": "🇳🇪",
    "dialCode": "+227",
    "availability": 182,
    "sortOrder": 146
  },
  {
    "code": "NG",
    "name": "Nigeria",
    "flag": "🇳🇬",
    "dialCode": "+234",
    "availability": 199,
    "sortOrder": 147
  },
  {
    "code": "KP",
    "name": "North Korea",
    "flag": "🇰🇵",
    "dialCode": "+850",
    "availability": 216,
    "sortOrder": 148
  },
  {
    "code": "MK",
    "name": "North Macedonia",
    "flag": "🇲🇰",
    "dialCode": "+389",
    "availability": 53,
    "sortOrder": 149
  },
  {
    "code": "MP",
    "name": "Northern Mariana Islands",
    "flag": "🇲🇵",
    "dialCode": "+1",
    "availability": 70,
    "sortOrder": 150
  },
  {
    "code": "NO",
    "name": "Norway",
    "flag": "🇳🇴",
    "dialCode": "+47",
    "availability": 87,
    "sortOrder": 151
  },
  {
    "code": "OM",
    "name": "Oman",
    "flag": "🇴🇲",
    "dialCode": "+968",
    "availability": 104,
    "sortOrder": 152
  },
  {
    "code": "PK",
    "name": "Pakistan",
    "flag": "🇵🇰",
    "dialCode": "+92",
    "availability": 121,
    "sortOrder": 153
  },
  {
    "code": "PW",
    "name": "Palau",
    "flag": "🇵🇼",
    "dialCode": "+680",
    "availability": 138,
    "sortOrder": 154
  },
  {
    "code": "PS",
    "name": "Palestine",
    "flag": "🇵🇸",
    "dialCode": "+970",
    "availability": 155,
    "sortOrder": 155
  },
  {
    "code": "PA",
    "name": "Panama",
    "flag": "🇵🇦",
    "dialCode": "+507",
    "availability": 172,
    "sortOrder": 156
  },
  {
    "code": "PG",
    "name": "Papua New Guinea",
    "flag": "🇵🇬",
    "dialCode": "+675",
    "availability": 189,
    "sortOrder": 157
  },
  {
    "code": "PY",
    "name": "Paraguay",
    "flag": "🇵🇾",
    "dialCode": "+595",
    "availability": 206,
    "sortOrder": 158
  },
  {
    "code": "PE",
    "name": "Peru",
    "flag": "🇵🇪",
    "dialCode": "+51",
    "availability": 43,
    "sortOrder": 159
  },
  {
    "code": "PH",
    "name": "Philippines",
    "flag": "🇵🇭",
    "dialCode": "+63",
    "availability": 60,
    "sortOrder": 160
  },
  {
    "code": "PL",
    "name": "Poland",
    "flag": "🇵🇱",
    "dialCode": "+48",
    "availability": 77,
    "sortOrder": 161
  },
  {
    "code": "PT",
    "name": "Portugal",
    "flag": "🇵🇹",
    "dialCode": "+351",
    "availability": 94,
    "sortOrder": 162
  },
  {
    "code": "PR",
    "name": "Puerto Rico",
    "flag": "🇵🇷",
    "dialCode": "+1",
    "availability": 111,
    "sortOrder": 163
  },
  {
    "code": "QA",
    "name": "Qatar",
    "flag": "🇶🇦",
    "dialCode": "+974",
    "availability": 128,
    "sortOrder": 164
  },
  {
    "code": "RE",
    "name": "Réunion",
    "flag": "🇷🇪",
    "dialCode": "+262",
    "availability": 145,
    "sortOrder": 165
  },
  {
    "code": "RO",
    "name": "Romania",
    "flag": "🇷🇴",
    "dialCode": "+40",
    "availability": 162,
    "sortOrder": 166
  },
  {
    "code": "RU",
    "name": "Russia",
    "flag": "🇷🇺",
    "dialCode": "+7",
    "availability": 179,
    "sortOrder": 167
  },
  {
    "code": "RW",
    "name": "Rwanda",
    "flag": "🇷🇼",
    "dialCode": "+250",
    "availability": 196,
    "sortOrder": 168
  },
  {
    "code": "KN",
    "name": "Saint Kitts and Nevis",
    "flag": "🇰🇳",
    "dialCode": "+1",
    "availability": 213,
    "sortOrder": 169
  },
  {
    "code": "LC",
    "name": "Saint Lucia",
    "flag": "🇱🇨",
    "dialCode": "+1",
    "availability": 50,
    "sortOrder": 170
  },
  {
    "code": "VC",
    "name": "Saint Vincent and the Grenadines",
    "flag": "🇻🇨",
    "dialCode": "+1",
    "availability": 67,
    "sortOrder": 171
  },
  {
    "code": "WS",
    "name": "Samoa",
    "flag": "🇼🇸",
    "dialCode": "+685",
    "availability": 84,
    "sortOrder": 172
  },
  {
    "code": "SM",
    "name": "San Marino",
    "flag": "🇸🇲",
    "dialCode": "+378",
    "availability": 101,
    "sortOrder": 173
  },
  {
    "code": "ST",
    "name": "São Tomé and Príncipe",
    "flag": "🇸🇹",
    "dialCode": "+239",
    "availability": 118,
    "sortOrder": 174
  },
  {
    "code": "SA",
    "name": "Saudi Arabia",
    "flag": "🇸🇦",
    "dialCode": "+966",
    "availability": 135,
    "sortOrder": 175
  },
  {
    "code": "SN",
    "name": "Senegal",
    "flag": "🇸🇳",
    "dialCode": "+221",
    "availability": 152,
    "sortOrder": 176
  },
  {
    "code": "RS",
    "name": "Serbia",
    "flag": "🇷🇸",
    "dialCode": "+381",
    "availability": 169,
    "sortOrder": 177
  },
  {
    "code": "SC",
    "name": "Seychelles",
    "flag": "🇸🇨",
    "dialCode": "+248",
    "availability": 186,
    "sortOrder": 178
  },
  {
    "code": "SL",
    "name": "Sierra Leone",
    "flag": "🇸🇱",
    "dialCode": "+232",
    "availability": 203,
    "sortOrder": 179
  },
  {
    "code": "SG",
    "name": "Singapore",
    "flag": "🇸🇬",
    "dialCode": "+65",
    "availability": 40,
    "sortOrder": 180
  },
  {
    "code": "SX",
    "name": "Sint Maarten",
    "flag": "🇸🇽",
    "dialCode": "+1",
    "availability": 57,
    "sortOrder": 181
  },
  {
    "code": "SK",
    "name": "Slovakia",
    "flag": "🇸🇰",
    "dialCode": "+421",
    "availability": 74,
    "sortOrder": 182
  },
  {
    "code": "SI",
    "name": "Slovenia",
    "flag": "🇸🇮",
    "dialCode": "+386",
    "availability": 91,
    "sortOrder": 183
  },
  {
    "code": "SB",
    "name": "Solomon Islands",
    "flag": "🇸🇧",
    "dialCode": "+677",
    "availability": 108,
    "sortOrder": 184
  },
  {
    "code": "SO",
    "name": "Somalia",
    "flag": "🇸🇴",
    "dialCode": "+252",
    "availability": 125,
    "sortOrder": 185
  },
  {
    "code": "ZA",
    "name": "South Africa",
    "flag": "🇿🇦",
    "dialCode": "+27",
    "availability": 142,
    "sortOrder": 186
  },
  {
    "code": "KR",
    "name": "South Korea",
    "flag": "🇰🇷",
    "dialCode": "+82",
    "availability": 159,
    "sortOrder": 187
  },
  {
    "code": "SS",
    "name": "South Sudan",
    "flag": "🇸🇸",
    "dialCode": "+211",
    "availability": 176,
    "sortOrder": 188
  },
  {
    "code": "ES",
    "name": "Spain",
    "flag": "🇪🇸",
    "dialCode": "+34",
    "availability": 193,
    "sortOrder": 189
  },
  {
    "code": "LK",
    "name": "Sri Lanka",
    "flag": "🇱🇰",
    "dialCode": "+94",
    "availability": 210,
    "sortOrder": 190
  },
  {
    "code": "SD",
    "name": "Sudan",
    "flag": "🇸🇩",
    "dialCode": "+249",
    "availability": 47,
    "sortOrder": 191
  },
  {
    "code": "SR",
    "name": "Suriname",
    "flag": "🇸🇷",
    "dialCode": "+597",
    "availability": 64,
    "sortOrder": 192
  },
  {
    "code": "SE",
    "name": "Sweden",
    "flag": "🇸🇪",
    "dialCode": "+46",
    "availability": 81,
    "sortOrder": 193
  },
  {
    "code": "CH",
    "name": "Switzerland",
    "flag": "🇨🇭",
    "dialCode": "+41",
    "availability": 98,
    "sortOrder": 194
  },
  {
    "code": "SY",
    "name": "Syria",
    "flag": "🇸🇾",
    "dialCode": "+963",
    "availability": 115,
    "sortOrder": 195
  },
  {
    "code": "TW",
    "name": "Taiwan",
    "flag": "🇹🇼",
    "dialCode": "+886",
    "availability": 132,
    "sortOrder": 196
  },
  {
    "code": "TJ",
    "name": "Tajikistan",
    "flag": "🇹🇯",
    "dialCode": "+992",
    "availability": 149,
    "sortOrder": 197
  },
  {
    "code": "TZ",
    "name": "Tanzania",
    "flag": "🇹🇿",
    "dialCode": "+255",
    "availability": 166,
    "sortOrder": 198
  },
  {
    "code": "TH",
    "name": "Thailand",
    "flag": "🇹🇭",
    "dialCode": "+66",
    "availability": 183,
    "sortOrder": 199
  },
  {
    "code": "TL",
    "name": "Timor-Leste",
    "flag": "🇹🇱",
    "dialCode": "+670",
    "availability": 200,
    "sortOrder": 200
  },
  {
    "code": "TG",
    "name": "Togo",
    "flag": "🇹🇬",
    "dialCode": "+228",
    "availability": 217,
    "sortOrder": 201
  },
  {
    "code": "TO",
    "name": "Tonga",
    "flag": "🇹🇴",
    "dialCode": "+676",
    "availability": 54,
    "sortOrder": 202
  },
  {
    "code": "TT",
    "name": "Trinidad and Tobago",
    "flag": "🇹🇹",
    "dialCode": "+1",
    "availability": 71,
    "sortOrder": 203
  },
  {
    "code": "TN",
    "name": "Tunisia",
    "flag": "🇹🇳",
    "dialCode": "+216",
    "availability": 88,
    "sortOrder": 204
  },
  {
    "code": "TR",
    "name": "Turkey",
    "flag": "🇹🇷",
    "dialCode": "+90",
    "availability": 105,
    "sortOrder": 205
  },
  {
    "code": "TM",
    "name": "Turkmenistan",
    "flag": "🇹🇲",
    "dialCode": "+993",
    "availability": 122,
    "sortOrder": 206
  },
  {
    "code": "TC",
    "name": "Turks and Caicos Islands",
    "flag": "🇹🇨",
    "dialCode": "+1",
    "availability": 139,
    "sortOrder": 207
  },
  {
    "code": "TV",
    "name": "Tuvalu",
    "flag": "🇹🇻",
    "dialCode": "+688",
    "availability": 156,
    "sortOrder": 208
  },
  {
    "code": "UG",
    "name": "Uganda",
    "flag": "🇺🇬",
    "dialCode": "+256",
    "availability": 173,
    "sortOrder": 209
  },
  {
    "code": "UA",
    "name": "Ukraine",
    "flag": "🇺🇦",
    "dialCode": "+380",
    "availability": 190,
    "sortOrder": 210
  },
  {
    "code": "AE",
    "name": "United Arab Emirates",
    "flag": "🇦🇪",
    "dialCode": "+971",
    "availability": 207,
    "sortOrder": 211
  },
  {
    "code": "GB",
    "name": "United Kingdom",
    "flag": "🇬🇧",
    "dialCode": "+44",
    "availability": 44,
    "sortOrder": 212
  },
  {
    "code": "US",
    "name": "United States",
    "flag": "🇺🇸",
    "dialCode": "+1",
    "availability": 61,
    "sortOrder": 213
  },
  {
    "code": "UY",
    "name": "Uruguay",
    "flag": "🇺🇾",
    "dialCode": "+598",
    "availability": 78,
    "sortOrder": 214
  },
  {
    "code": "UZ",
    "name": "Uzbekistan",
    "flag": "🇺🇿",
    "dialCode": "+998",
    "availability": 95,
    "sortOrder": 215
  },
  {
    "code": "VU",
    "name": "Vanuatu",
    "flag": "🇻🇺",
    "dialCode": "+678",
    "availability": 112,
    "sortOrder": 216
  },
  {
    "code": "VA",
    "name": "Vatican City",
    "flag": "🇻🇦",
    "dialCode": "+39",
    "availability": 129,
    "sortOrder": 217
  },
  {
    "code": "VE",
    "name": "Venezuela",
    "flag": "🇻🇪",
    "dialCode": "+58",
    "availability": 146,
    "sortOrder": 218
  },
  {
    "code": "VN",
    "name": "Vietnam",
    "flag": "🇻🇳",
    "dialCode": "+84",
    "availability": 163,
    "sortOrder": 219
  },
  {
    "code": "VI",
    "name": "U.S. Virgin Islands",
    "flag": "🇻🇮",
    "dialCode": "+1",
    "availability": 180,
    "sortOrder": 220
  },
  {
    "code": "YE",
    "name": "Yemen",
    "flag": "🇾🇪",
    "dialCode": "+967",
    "availability": 197,
    "sortOrder": 221
  },
  {
    "code": "ZM",
    "name": "Zambia",
    "flag": "🇿🇲",
    "dialCode": "+260",
    "availability": 214,
    "sortOrder": 222
  },
  {
    "code": "ZW",
    "name": "Zimbabwe",
    "flag": "🇿🇼",
    "dialCode": "+263",
    "availability": 51,
    "sortOrder": 223
  }
];

export function filterWorldCountries(q: string): WorldCountry[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return WORLD_COUNTRIES;
  return WORLD_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(needle) ||
      c.code.toLowerCase().includes(needle) ||
      c.dialCode.includes(needle),
  );
}

export function worldCountryByCode(code: string): WorldCountry | undefined {
  return WORLD_COUNTRIES.find((c) => c.code === code.toUpperCase());
}
