module Suite exposing (suite)

{-| -}

import Html
import Html.Attributes as Attr
import V8.Benchmark.Runner.Json exposing (..)
import V8.Debug


type alias Model =
    { someString : String
    , someNum : Int
    , sortKey : ( String, Int )
    }


emptyRecord : Model
emptyRecord =
    { someString = "Str"
    , someNum = 0
    , sortKey = ( "Str", 0 )
    }


type Msg
    = SetString String
    | SetNum Int


update : Msg -> Model -> Model
update msg model =
    case msg of
        SetString val ->
            { model
                | someString = val
                , sortKey = ( val, model.someNum )
            }

        SetNum val ->
            { model
                | someNum = val
                , sortKey = ( model.someString, val )
            }


range : List Int
range =
    List.range 0 100


suite : Benchmark
suite =
    describe "Updates"
        [ benchmark "Inc" <|
            \_ ->
                List.foldl updater emptyRecord range
        ]


updater : Int -> Model -> Model
updater idx rec =
    rec
        |> update (SetString ("String" ++ String.fromInt idx))
        |> update (SetNum idx)
